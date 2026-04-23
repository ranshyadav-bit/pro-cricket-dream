import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel, StatBox } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { mergeMatchStats } from "@/game/career";
import {
  aiBowlerDelivery,
  oversForFormat,
  resolveBatting,
  resolveBowling,
} from "@/game/engine";
import { generateClubSquad, getNationSquad, getOppositionSquad } from "@/game/rosters";
import type { RosterPlayer } from "@/game/rosters";
import type {
  BallOutcome,
  DeliveryType,
  Fixture,
  LengthPos,
  LinePos,
  Role,
  SaveGame,
  ShotType,
} from "@/game/types";

const SHOTS: ShotType[] = [
  "Leave", "Defend", "Block", "Push for 1",
  "Drive", "Cut", "Pull", "Sweep",
  "Loft", "Slog",
];

const LINES: LinePos[] = ["Wide", "Off", "Stump", "Leg"];
const LENGTHS: LengthPos[] = ["Yorker", "Full", "Good", "Short"];
const DELIVERIES_BY_TYPE: Record<string, DeliveryType[]> = {
  pace: ["Stock", "Yorker", "Bouncer", "Slower", "Outswinger", "Inswinger"],
  spin: ["Stock", "Off-Break", "Leg-Break", "Doosra", "Slower"],
};

const searchSchema = z.object({
  id: z.string().catch(""),
});

export const Route = createFileRoute("/match")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Match,
});

type Phase = "intro" | "toss" | "batting" | "bowling" | "innings-break" | "result";

interface InningsState {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number; // legal balls bowled
  log: BallOutcome[];
  declared: boolean;
  // player batting in this innings
  playerRuns: number;
  playerBalls: number;
  playerFours: number;
  playerSixes: number;
  playerOut: boolean;
  battingPosition: number; // 1..9 (when player walks in)
  // partner stats while at the crease (live)
  partnerName: string;
  partnerRuns: number;
  partnerBalls: number;
  partnerOut: boolean;
  // who's on strike
  strikerIsPlayer: boolean;
  // bowling
  playerWicketsTaken: number;
  playerRunsConceded: number;
  playerBallsBowled: number;
}

function emptyInnings(batting: string, bowling: string, partnerName = "Partner"): InningsState {
  return {
    battingTeam: batting, bowlingTeam: bowling,
    runs: 0, wickets: 0, balls: 0, log: [], declared: false,
    playerRuns: 0, playerBalls: 0, playerFours: 0, playerSixes: 0, playerOut: false,
    battingPosition: 1,
    partnerName, partnerRuns: 0, partnerBalls: 0, partnerOut: false,
    strikerIsPlayer: true,
    playerWicketsTaken: 0, playerRunsConceded: 0, playerBallsBowled: 0,
  };
}

// Where in the order does this role bat?
function battingPositionForRole(role: Role): number {
  switch (role) {
    case "Top-Order Bat": return 1;
    case "Wicket-Keeper Bat": return 3;
    case "Middle-Order Bat": return 4;
    case "All-Rounder": return 5;
    case "Finisher": return 6;
    case "Off-Spinner":
    case "Leg-Spinner": return 8;
    case "Pace Bowler":
    case "Swing Bowler": return 9;
  }
}

function Match() {
  const navigate = useNavigate();
  const { id } = useSearch({ from: "/match" });
  const [save, setSave] = useState<SaveGame | null>(null);
  const fixture = useMemo<Fixture | null>(() => {
    if (!save) return null;
    return save.fixtures.find((f) => f.id === id) ?? null;
  }, [save, id]);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;
  if (!fixture) {
    return (
      <GameShell>
        <GamePanel title="Match not found">
          <p>This fixture isn't on your calendar.</p>
        </GamePanel>
      </GameShell>
    );
  }

  return <MatchInner save={save} setSave={setSave} fixture={fixture} />;
}

function MatchInner({
  save, setSave, fixture,
}: {
  save: SaveGame;
  setSave: (s: SaveGame) => void;
  fixture: Fixture;
}) {
  const navigate = useNavigate();
  const player = save.player;
  const isBatter = ["Top-Order Bat", "Middle-Order Bat", "Finisher", "Wicket-Keeper Bat"].includes(player.role);
  const isBowler = ["Pace Bowler", "Swing Bowler", "Off-Spinner", "Leg-Spinner"].includes(player.role);
  const isAR = player.role === "All-Rounder";

  const isTest = fixture.format === "Test";
  const oversPerInnings = oversForFormat(fixture.format);
  const oversPerDay = isTest ? 90 : oversPerInnings;
  const playerBowlsOvers = isBowler || isAR
    ? (isTest ? 18 : Math.min(4, Math.floor(oversPerInnings / 5)))
    : 0;
  const playerBatPos = battingPositionForRole(player.role);

  const myTeam = save.player.team;
  const opp = fixture.opponent;

  // Real squads for international/league teams; generated names for club tier
  const oppSquad = useMemo<RosterPlayer[]>(() => {
    const real = getOppositionSquad({
      competition: fixture.competition,
      opponent: opp,
      format: fixture.format,
      nation: save.player.nation,
    });
    return real ?? generateClubSquad(save.player.nation, opp, 11);
  }, [fixture.competition, fixture.format, opp, save.player.nation]);

  const mySquad = useMemo<RosterPlayer[]>(() => {
    if (save.player.tier === "International") {
      const fmt = fixture.format === "Test" ? "Test" : fixture.format === "ODI" ? "ODI" : "T20";
      return [
        { name: save.player.name, role: save.player.role, rating: 75 },
        ...getNationSquad(save.player.nation, fmt).filter((p) => p.name !== save.player.name).slice(0, 10),
      ];
    }
    const real = getOppositionSquad({ competition: fixture.competition, opponent: myTeam, format: fixture.format, nation: save.player.nation });
    if (real) {
      return [{ name: save.player.name, role: save.player.role, rating: 75 }, ...real.filter((p) => p.name !== save.player.name).slice(0, 10)];
    }
    return [{ name: save.player.name, role: save.player.role, rating: 75 }, ...generateClubSquad(save.player.nation, myTeam, 10)];
  }, [save.player, myTeam, fixture.competition, fixture.format]);

  // Ordered batting XI for "us" — sorted by batting suitability so partner names cycle realistically.
  const myBattingOrder = useMemo<RosterPlayer[]>(() => {
    const order = [...mySquad];
    order.sort((a, b) => battingPositionForRole(a.role) - battingPositionForRole(b.role));
    return order;
  }, [mySquad]);

  // ---- Toss + match phase ----
  // Try resuming an existing snapshot if it matches this fixture
  const snap = save.matchInProgress && save.matchInProgress.fixtureId === fixture.id ? save.matchInProgress : null;

  const [phase, setPhase] = useState<Phase>(snap ? snap.phase as Phase : "toss");
  const [tossWon] = useState(() => snap ? snap.tossWon : Math.random() < 0.5);
  const [tossChoice, setTossChoice] = useState<"bat" | "bowl" | null>(snap ? snap.tossChoice : null);
  const [battingFirst, setBattingFirst] = useState<boolean>(snap ? snap.battingFirst : true);

  // Innings list — supports up to 4 (Tests). Allocated lazily via setupInnings()
  const [innings, setInnings] = useState<InningsState[]>(() => {
    if (snap) {
      return snap.innings.map((i) => ({
        ...i,
        declared: false,
        partnerOut: false,
      })) as InningsState[];
    }
    return [];
  });
  const [currentInn, setCurrentInn] = useState(snap ? snap.currentInnings : 0);
  const [target, setTarget] = useState<number | null>(snap ? snap.target : null);
  const [day, setDay] = useState<number>(snap ? (snap.innings[snap.currentInnings]?.balls ?? 0) > 0 ? Math.floor((snap.innings[snap.currentInnings].balls / 6) / oversPerDay) + 1 : 1 : 1);

  function partnerForPosition(pos: number): string {
    // Pick the partner from our XI who isn't the player and matches the position.
    const others = myBattingOrder.filter((p) => p.name !== save.player.name);
    return others[Math.min(pos - 1, others.length - 1)]?.name ?? "Partner";
  }

  // After toss, build the innings array
  function setupInnings(choice: "bat" | "bowl") {
    setTossChoice(choice);
    const usBatFirst = tossWon ? choice === "bat" : choice === "bowl";
    setBattingFirst(usBatFirst);
    const total = isTest ? 4 : 2;
    const list: InningsState[] = [];
    for (let i = 0; i < total; i++) {
      // Innings 1 & 3 -> first batter team; 2 & 4 -> the other
      const isFirstBatTeam = i % 2 === 0;
      const battingTeam = (isFirstBatTeam && usBatFirst) || (!isFirstBatTeam && !usBatFirst) ? myTeam : opp;
      const bowlingTeam = battingTeam === myTeam ? opp : myTeam;
      const partnerStart = battingTeam === myTeam ? partnerForPosition(2) : "—";
      list.push(emptyInnings(battingTeam, bowlingTeam, partnerStart));
    }
    setInnings(list);
    setCurrentInn(0);
    setPhase("intro");
  }

  // Helpers to access current innings
  const inn = innings[currentInn];
  const isMyBatting = !!inn && inn.battingTeam === myTeam;
  const oversBowled = inn ? Math.floor(inn.balls / 6) : 0;
  const ballThisOver = inn ? inn.balls % 6 : 0;

  // For bowling phase
  const [aiBatterRating, setAiBatterRating] = useState(() => 50 + Math.floor(Math.random() * 25));
  const [aiBatterIdx, setAiBatterIdx] = useState(1);
  const [bowlingChoice, setBowlingChoice] = useState<{ delivery: DeliveryType; line: LinePos; length: LengthPos }>({ delivery: "Stock", line: "Stump", length: "Good" });
  const isPaceRole = ["Pace Bowler", "Swing Bowler"].includes(player.role) || isAR;
  const deliveryOptions = isPaceRole ? DELIVERIES_BY_TYPE.pace : DELIVERIES_BY_TYPE.spin;

  function startInnings() {
    if (!inn) return;
    if (isMyBatting) {
      // Player walks in at their batting position; before that, sim openers.
      simUntilPlayerComes();
      setPhase("batting");
    } else {
      setPhase("bowling");
    }
  }

  // Sim balls (with partner script) until the player walks to the crease
  function simUntilPlayerComes() {
    if (!inn) return;
    setInnings((all) => {
      const next = [...all];
      const ci = { ...next[currentInn] };
      if (playerBatPos <= 1) {
        ci.battingPosition = 1;
        ci.partnerName = partnerForPosition(2);
        next[currentInn] = ci;
        return next;
      }
      // Sim wickets until enough have fallen so player at position playerBatPos is next in
      let safety = 1000;
      while (ci.wickets < playerBatPos - 1 && safety-- > 0) {
        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.06) isWicket = true;
        else if (r < 0.5) runs = 0;
        else if (r < 0.78) runs = 1;
        else if (r < 0.88) runs = 2;
        else if (r < 0.96) runs = 4;
        else runs = 6;
        ci.balls += 1;
        ci.runs += runs;
        if (isWicket) ci.wickets += 1;
      }
      ci.battingPosition = ci.wickets + 1;
      ci.partnerName = partnerForPosition(ci.wickets + 2);
      ci.partnerRuns = 0; ci.partnerBalls = 0; ci.partnerOut = false;
      ci.strikerIsPlayer = true;
      ci.log = [{
        runs: 0, isWicket: false, isBoundary: false, isExtra: false,
        commentary: `${save.player.name} walks to the crease at #${ci.battingPosition} — joins ${ci.partnerName}.`,
      }, ...ci.log].slice(0, 25);
      next[currentInn] = ci;
      return next;
    });
  }

  // ---------- Batting flow ----------
  function takeShot(shot: ShotType) {
    if (!inn) return;
    const ai = aiBowlerDelivery(60, fixture.format, ballThisOver);
    const oversLeft = oversPerInnings - oversBowled - (ballThisOver ? 1 : 0);
    const pressure = target ? Math.min(1, Math.max(0, (target - inn.runs) / Math.max(1, oversLeft * 6))) : 0.2;
    const outcome = resolveBatting({
      player,
      shot,
      delivery: ai.delivery,
      line: ai.line,
      length: ai.length,
      bowlerRating: 50 + Math.floor(Math.random() * 25),
      pressure,
    });
    applyStrikerBall(outcome, true);
  }

  // applyStrikerBall: if the player is on strike, results count for them; otherwise for partner.
  function applyStrikerBall(o: BallOutcome, fromPlayer: boolean) {
    setInnings((all) => {
      const next = [...all];
      const ci = { ...next[currentInn], log: [o, ...next[currentInn].log].slice(0, 25) };
      if (!o.isExtra) ci.balls += 1;
      ci.runs += o.runs;
      const onStrikeIsPlayer = ci.strikerIsPlayer;
      // Run-out chance on a 2 (rare)
      let runOut = false;
      if (!o.isWicket && !o.isExtra && o.runs === 2 && Math.random() < 0.04) {
        runOut = true;
      }
      if (onStrikeIsPlayer && fromPlayer) {
        if (!o.isExtra) {
          ci.playerBalls += 1;
          ci.playerRuns += o.runs;
          if (o.runs === 4) ci.playerFours += 1;
          if (o.runs === 6) ci.playerSixes += 1;
        }
        if (o.isWicket || runOut) {
          ci.wickets += 1;
          ci.playerOut = true;
          if (runOut) {
            const ro: BallOutcome = {
              runs: 1, isWicket: true, wicketType: "Run Out", isBoundary: false, isExtra: false,
              commentary: `Disaster! ${save.player.name} short of his ground — RUN OUT for ${ci.playerRuns}.`,
            };
            ci.log = [ro, ...ci.log].slice(0, 25);
          }
        }
      } else if (!onStrikeIsPlayer && !fromPlayer) {
        if (!o.isExtra) {
          ci.partnerBalls += 1;
          ci.partnerRuns += o.runs;
        }
        if (o.isWicket || runOut) {
          ci.wickets += 1;
          ci.partnerOut = true;
          // Bring next partner if more wickets allowed
          if (ci.wickets < 10 && !ci.playerOut) {
            const nextPartnerIdx = ci.wickets + 1; // approx position
            ci.partnerName = partnerForPosition(nextPartnerIdx + 1);
            ci.partnerRuns = 0; ci.partnerBalls = 0; ci.partnerOut = false;
            ci.log = [{
              runs: 0, isWicket: false, isBoundary: false, isExtra: false,
              commentary: `${ci.partnerName} walks in to join ${save.player.name}.`,
            }, ...ci.log].slice(0, 25);
          }
        }
      }
      // Strike rotation: odd runs swap; end of over swaps too
      if (!o.isExtra && !o.isWicket && (o.runs === 1 || o.runs === 3)) {
        ci.strikerIsPlayer = !ci.strikerIsPlayer;
      }
      if (!o.isExtra && (ci.balls % 6 === 0)) {
        ci.strikerIsPlayer = !ci.strikerIsPlayer;
      }
      next[currentInn] = ci;
      return next;
    });
  }

  // When player is off strike (and still in), AI sims partner's ball automatically
  useEffect(() => {
    if (phase !== "batting" || !inn) return;
    if (inn.playerOut) return;
    if (inn.strikerIsPlayer) return;
    if (inn.balls >= oversPerInnings * 6) return;
    if (target !== null && inn.runs >= target) return;
    const t = setTimeout(() => {
      const r = Math.random();
      let runs = 0; let isWicket = false;
      // Partner less skilled than player
      if (r < 0.05) isWicket = true;
      else if (r < 0.55) runs = 0;
      else if (r < 0.8) runs = 1;
      else if (r < 0.88) runs = 2;
      else if (r < 0.96) runs = 4;
      else runs = 6;
      const o: BallOutcome = {
        runs, isWicket, isBoundary: runs === 4 || runs === 6, isExtra: false,
        commentary: isWicket ? `${inn.partnerName} falls — caught up the order.` : runs === 0 ? `${inn.partnerName} defends.` : runs >= 4 ? `${inn.partnerName} finds the rope!` : `${inn.partnerName} works it for ${runs}.`,
      };
      applyStrikerBall(o, false);
    }, 600);
    return () => clearTimeout(t);
  }, [phase, inn, oversPerInnings, target]);

  // After player out: fast-forward remaining wickets in this innings (lower order)
  useEffect(() => {
    if (phase !== "batting" || !inn) return;
    if (!inn.playerOut) return;
    if (inn.balls >= oversPerInnings * 6 || inn.wickets >= 10) return;
    if (target !== null && inn.runs >= target) return;
    const t = setInterval(() => {
      setInnings((all) => {
        const next = [...all];
        const ci = { ...next[currentInn] };
        if (ci.balls >= oversPerInnings * 6 || ci.wickets >= 10) return all;
        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.07) isWicket = true;
        else if (r < 0.55) runs = 0;
        else if (r < 0.8) runs = 1;
        else if (r < 0.88) runs = 2;
        else if (r < 0.96) runs = 4;
        else runs = 6;
        const o: BallOutcome = {
          runs, isWicket, isBoundary: runs === 4 || runs === 6, isExtra: false,
          commentary: isWicket ? `Tail-ender falls.` : runs === 0 ? `Dot.` : runs >= 4 ? `Tail-ender pumps it!` : `${runs} taken.`,
        };
        ci.log = [o, ...ci.log].slice(0, 25);
        ci.runs += runs; ci.balls += 1;
        if (isWicket) ci.wickets += 1;
        next[currentInn] = ci;
        return next;
      });
    }, 220);
    return () => clearInterval(t);
  }, [phase, inn?.playerOut, oversPerInnings, target, currentInn]);

  // ---------- Bowling flow ----------
  function bowlBall() {
    if (!inn) return;
    if (inn.playerBallsBowled >= playerBowlsOvers * 6) return;
    const oversLeft = oversPerInnings - oversBowled - (ballThisOver ? 1 : 0);
    const pressure = target ? Math.min(1, Math.max(0, (target - inn.runs) / Math.max(1, oversLeft * 6))) : 0.2;
    const outcome = resolveBowling({
      player,
      delivery: bowlingChoice.delivery,
      line: bowlingChoice.line,
      length: bowlingChoice.length,
      batterRating: aiBatterRating,
      pressure,
    });
    setInnings((all) => {
      const next = [...all];
      const ci = { ...next[currentInn], log: [outcome, ...next[currentInn].log].slice(0, 25) };
      ci.runs += outcome.runs;
      if (!outcome.isExtra) {
        ci.balls += 1;
        ci.playerBallsBowled += 1;
      }
      ci.playerRunsConceded += outcome.runs;
      if (outcome.isWicket) {
        ci.wickets += 1;
        ci.playerWicketsTaken += 1;
      }
      next[currentInn] = ci;
      return next;
    });
    if (outcome.isWicket) {
      setAiBatterIdx((i) => i + 1);
      setAiBatterRating(40 + Math.floor(Math.random() * 30));
    }
  }

  // Auto-sim non-player overs in bowling innings
  const simInProgress = useRef(false);
  useEffect(() => {
    if (phase !== "bowling" || !inn) return;
    if (simInProgress.current) return;
    const playerDone = inn.playerBallsBowled >= playerBowlsOvers * 6;
    const inningsDone = inn.balls >= oversPerInnings * 6 || inn.wickets >= 10;
    if (inningsDone) return;
    if (!playerDone) return;
    simInProgress.current = true;
    const interval = setInterval(() => {
      setInnings((all) => {
        const next = [...all];
        const ci = { ...next[currentInn] };
        if (ci.balls >= oversPerInnings * 6 || ci.wickets >= 10) return all;
        if (target !== null && ci.runs >= target) return all;
        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.045) isWicket = true;
        else if (r < 0.5) runs = 0;
        else if (r < 0.78) runs = 1;
        else if (r < 0.86) runs = 2;
        else if (r < 0.95) runs = 4;
        else runs = 6;
        const o: BallOutcome = {
          runs, isWicket, isBoundary: runs === 4 || runs === 6, isExtra: false,
          commentary: isWicket ? `Partner takes a wicket!` : runs === 0 ? `Dot.` : runs >= 4 ? `Conceded a boundary.` : `${runs} run${runs>1?"s":""} given.`,
        };
        ci.log = [o, ...ci.log].slice(0, 25);
        ci.runs += runs; ci.balls += 1;
        if (isWicket) ci.wickets += 1;
        next[currentInn] = ci;
        return next;
      });
    }, 200);
    return () => { clearInterval(interval); simInProgress.current = false; };
  }, [phase, inn?.playerBallsBowled, inn?.balls, inn?.wickets, oversPerInnings, playerBowlsOvers, target, currentInn]);

  // Test day tracking — bump day when 90 overs of innings consumed
  useEffect(() => {
    if (!isTest || !inn) return;
    const newDay = Math.floor(inn.balls / 6 / oversPerDay) + 1;
    if (newDay !== day) setDay(newDay);
  }, [isTest, inn?.balls, oversPerDay, day]);

  // Detect innings completion → next phase
  useEffect(() => {
    if (phase !== "batting" && phase !== "bowling") return;
    if (!inn) return;
    const inningsDone = inn.declared || inn.balls >= oversPerInnings * 6 || inn.wickets >= 10;
    const targetReached = target !== null && inn.runs >= target;
    if (inningsDone || targetReached) {
      const last = currentInn === innings.length - 1;
      if (last) setPhase("result");
      else setPhase("innings-break");
    }
  }, [phase, inn, currentInn, innings.length, target, oversPerInnings]);

  function startNextInnings() {
    if (!inn) return;
    const nextIdx = currentInn + 1;
    // Compute target if applicable
    if (isTest) {
      // Test target is set only in 4th innings: lead from team 1 vs team 2
      if (nextIdx === 3) {
        // After 3rd innings, set 4th innings target
        const team1Total = (innings[0].battingTeam === innings[2].battingTeam ? innings[0].runs + innings[2].runs : innings[0].runs) -
          (innings[0].battingTeam !== innings[2].battingTeam ? innings[2].runs : 0);
        // simpler: side batting in innings 4 chases (team1.bat + team1.bat3rd) - team2.bat
        const i1 = innings[0]; const i2 = innings[1]; const i3 = innings[2];
        const fourthBat = innings.length > 3 ? innings[3].battingTeam : "";
        const total1 = i1.battingTeam === fourthBat ? i1.runs + (i3.battingTeam === fourthBat ? i3.runs : 0) : (i3.battingTeam === fourthBat ? i3.runs : 0);
        const total2 = i2.battingTeam === fourthBat ? 0 : (i1.battingTeam !== fourthBat ? i1.runs : 0) + (i3.battingTeam !== fourthBat ? i3.runs : 0);
        const totalAgainst = i2.battingTeam !== fourthBat ? i2.runs : 0;
        // target = (totalAgainst + opponentTotal) - chasingTotal + 1
        const chasing = total1; // runs already scored by chasing team
        const conceded = totalAgainst + total2; // runs scored by other team
        setTarget(conceded - chasing + 1);
      }
    } else {
      setTarget(innings[0].runs + 1);
    }
    setCurrentInn(nextIdx);
    setDay(isTest ? day : 1);
    const nextInn = innings[nextIdx];
    if (!nextInn) return;
    if (nextInn.battingTeam === myTeam) {
      simUntilPlayerComes();
      setPhase("batting");
    } else {
      setPhase("bowling");
    }
  }

  function declareInnings() {
    setInnings((all) => {
      const next = [...all];
      next[currentInn] = { ...next[currentInn], declared: true };
      return next;
    });
  }

  // Save match results when phase becomes "result"
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== "result") return;
    if (savedRef.current) return;
    savedRef.current = true;
    // Sum across all innings (Tests will have up to 4)
    const myInns = innings.filter((i) => i.battingTeam === myTeam);
    const oppInns = innings.filter((i) => i.battingTeam === opp);
    const myBowlInns = innings.filter((i) => i.bowlingTeam === myTeam);
    const myRuns = myInns.reduce((s, i) => s + i.playerRuns, 0);
    const myBalls = myInns.reduce((s, i) => s + i.playerBalls, 0);
    const myFours = myInns.reduce((s, i) => s + i.playerFours, 0);
    const mySixes = myInns.reduce((s, i) => s + i.playerSixes, 0);
    const myOut = myInns.some((i) => i.playerOut);
    const wickets = myBowlInns.reduce((s, i) => s + i.playerWicketsTaken, 0);
    const runsConceded = myBowlInns.reduce((s, i) => s + i.playerRunsConceded, 0);
    const ballsBowled = myBowlInns.reduce((s, i) => s + i.playerBallsBowled, 0);
    const myTotal = myInns.reduce((s, i) => s + i.runs, 0);
    const oppTotal = oppInns.reduce((s, i) => s + i.runs, 0);
    const won = myTotal > oppTotal;
    const tied = myTotal === oppTotal;
    const matchSummary = {
      runs: myRuns, balls: myBalls, fours: myFours, sixes: mySixes, out: myOut,
      wickets, runsConceded, ballsBowled,
      catches: 0,
      manOfMatch: (myRuns >= 50 || wickets >= 3) && Math.random() < 0.5,
      played: true,
    };
    const newStats = mergeMatchStats(save.stats, matchSummary);
    const newSeasonStats = mergeMatchStats(save.seasonStats, matchSummary);
    let conf = save.player.confidence;
    let mor = save.player.morale;
    if (matchSummary.runs >= 50 || matchSummary.wickets >= 3) { conf = Math.min(100, conf + 10); mor = Math.min(100, mor + 5); }
    else if (matchSummary.runs <= 5 && matchSummary.wickets === 0) { conf = Math.max(0, conf - 8); mor = Math.max(0, mor - 3); }
    if (won) mor = Math.min(100, mor + 4);
    if (!won && !tied) mor = Math.max(0, mor - 2);
    const newSave: SaveGame = {
      ...save,
      stats: newStats,
      seasonStats: newSeasonStats,
      player: { ...save.player, confidence: conf, morale: mor, fitness: Math.max(20, save.player.fitness - 6) },
      fixtures: save.fixtures.map((f) => f.id === fixture.id ? { ...f, played: true } : f),
      matchInProgress: null, // clear snapshot on completion
      inbox: [
        {
          id: Math.random().toString(36).slice(2, 10),
          week: fixture.week, year: fixture.year,
          from: fixture.competition,
          subject: `${won ? "WON" : tied ? "TIED" : "LOST"} vs ${fixture.opponent}`,
          body: `Final: ${myTotal} vs ${oppTotal}. You: ${matchSummary.runs}${matchSummary.out ? "" : "*"} (${matchSummary.balls})${matchSummary.ballsBowled > 0 ? ` · ${matchSummary.wickets}/${matchSummary.runsConceded}` : ""}.${matchSummary.manOfMatch ? " Player of the Match!" : ""}`,
          read: false,
          type: (matchSummary.manOfMatch ? "milestone" : "system") as "milestone" | "system",
        },
        ...save.inbox,
      ].slice(0, 50),
    };
    writeSave(newSave);
    setSave(newSave);
  }, [phase, innings, save, fixture, myTeam, opp, setSave]);

  // ---------- AUTO-SAVE mid-match snapshot ----------
  const persistSnapshot = useCallback(() => {
    if (phase === "result" || phase === "toss") return;
    if (!innings.length) return;
    const snapshot: NonNullable<SaveGame["matchInProgress"]> = {
      fixtureId: fixture.id,
      competition: fixture.competition,
      opponent: fixture.opponent,
      format: fixture.format,
      tossWon,
      tossChoice: tossChoice ?? "bat",
      battingFirst,
      innings: innings.map((i) => ({
        battingTeam: i.battingTeam,
        bowlingTeam: i.bowlingTeam,
        runs: i.runs, wickets: i.wickets, balls: i.balls,
        log: i.log,
        playerRuns: i.playerRuns, playerBalls: i.playerBalls,
        playerFours: i.playerFours, playerSixes: i.playerSixes,
        playerOut: i.playerOut,
        playerWicketsTaken: i.playerWicketsTaken,
        playerRunsConceded: i.playerRunsConceded,
        playerBallsBowled: i.playerBallsBowled,
        strikerIsPlayer: i.strikerIsPlayer,
        partnerName: i.partnerName,
        partnerRuns: i.partnerRuns,
        partnerBalls: i.partnerBalls,
        battingPosition: i.battingPosition,
        day,
      })),
      currentInnings: currentInn,
      target,
      phase: phase as "intro" | "batting" | "bowling" | "innings-break" | "result",
      startedAt: snap?.startedAt ?? Date.now(),
    };
    const updated: SaveGame = { ...save, matchInProgress: snapshot };
    writeSave(updated);
  }, [phase, innings, currentInn, target, day, fixture, tossWon, tossChoice, battingFirst, save, snap]);

  // Persist after meaningful changes (debounced via timeout)
  useEffect(() => {
    if (phase === "result") return;
    const t = setTimeout(persistSnapshot, 350);
    return () => clearTimeout(t);
  }, [innings, phase, currentInn, persistSnapshot]);

  // ---------- Render ----------
  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-display text-xs text-primary">{fixture.competition} · {fixture.format}{isTest ? ` · Day ${day}` : ""}</p>
          <h1 className="text-display text-2xl">{myTeam} vs {opp}</h1>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {fixture.venue} · W{fixture.week}·{fixture.year}
        </div>
      </div>

      {phase === "toss" && (
        <GamePanel title="Toss">
          {tossWon ? (
            <>
              <p>You won the toss! What do you want to do?</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setupInnings("bat")}
                  className="rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
                >
                  Bat First
                </button>
                <button
                  onClick={() => setupInnings("bowl")}
                  className="rounded-md border border-secondary/40 bg-secondary/10 px-6 py-2 text-display text-sm text-secondary"
                >
                  Bowl First
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{opp} won the toss and chose to {Math.random() < 0.55 ? "bat" : "bowl"} first.</p>
              <button
                onClick={() => setupInnings(Math.random() < 0.5 ? "bat" : "bowl")}
                className="mt-4 rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
              >
                Continue →
              </button>
            </>
          )}
        </GamePanel>
      )}

      {phase === "intro" && inn && (
        <GamePanel title={isTest ? `Innings ${currentInn + 1} — ${inn.battingTeam}` : (currentInn === 0 ? "Innings 1" : "Innings 2")}>
          <p>{inn.battingTeam} batting, {inn.bowlingTeam} bowling.</p>
          {target !== null && <p className="mt-1 text-primary">Target: {target}</p>}
          <button
            onClick={startInnings}
            className="mt-4 rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
          >
            Start →
          </button>
        </GamePanel>
      )}

      {(phase === "batting" || phase === "bowling" || phase === "innings-break") && inn && (
        <>
          {/* Scoreboard */}
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Scoreboard
              title={`Innings ${currentInn + 1} — ${inn.battingTeam}`}
              runs={inn.runs}
              wickets={inn.wickets}
              balls={inn.balls}
              totalOvers={oversPerInnings}
              target={target}
            />
            {currentInn > 0 && (
              <Scoreboard
                title={`Prev Innings — ${innings[currentInn - 1].battingTeam}`}
                runs={innings[currentInn - 1].runs}
                wickets={innings[currentInn - 1].wickets}
                balls={innings[currentInn - 1].balls}
                totalOvers={oversPerInnings}
                muted
              />
            )}
          </div>

          {/* Player + Partner cards (batting) */}
          {isMyBatting && (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <PlayerCard
                name={`${player.name}${inn.strikerIsPlayer ? " *" : ""}`}
                runs={inn.playerRuns}
                balls={inn.playerBalls}
                fours={inn.playerFours}
                sixes={inn.playerSixes}
                out={inn.playerOut}
                position={inn.battingPosition}
              />
              <PartnerCard
                name={`${inn.partnerName}${!inn.strikerIsPlayer ? " *" : ""}`}
                runs={inn.partnerRuns}
                balls={inn.partnerBalls}
                out={inn.partnerOut}
              />
            </div>
          )}

          {/* Bowler card */}
          {!isMyBatting && (
            <div className="mb-4">
              <BowlerCard
                name={player.name}
                wickets={inn.playerWicketsTaken}
                runs={inn.playerRunsConceded}
                balls={inn.playerBallsBowled}
                quota={playerBowlsOvers * 6}
              />
            </div>
          )}

          {phase === "batting" && (
            <BattingPanel
              shotsDisabled={
                inn.playerOut ||
                !inn.strikerIsPlayer ||
                inn.balls >= oversPerInnings * 6 ||
                inn.wickets >= 10 ||
                (target !== null && inn.runs >= target)
              }
              shotsLocked={inn.playerOut}
              waitingForPartner={!inn.playerOut && !inn.strikerIsPlayer}
              onShot={takeShot}
              canDeclare={isTest && inn.playerRuns + inn.partnerRuns >= 0 && inn.runs > 0 && !inn.declared}
              onDeclare={declareInnings}
            />
          )}

          {phase === "bowling" && (
            <BowlingPanel
              choice={bowlingChoice}
              setChoice={setBowlingChoice}
              deliveryOptions={deliveryOptions}
              canBowl={inn.playerBallsBowled < playerBowlsOvers * 6 && inn.balls < oversPerInnings * 6 && inn.wickets < 10 && !(target !== null && inn.runs >= target)}
              quota={playerBowlsOvers}
              ballsBowled={inn.playerBallsBowled}
              aiBatter={aiBatterIdx}
              onBowl={bowlBall}
            />
          )}

          {phase === "innings-break" && (
            <GamePanel title={isTest ? `End of Innings ${currentInn + 1}` : "Innings Break"}>
              <p>{inn.battingTeam} {inn.declared ? "declared at" : "finished on"} {inn.runs}/{inn.wickets} ({(inn.balls/6).toFixed(1)} ov).</p>
              {!isTest && currentInn === 0 && <p className="mt-1">Target: {inn.runs + 1}.</p>}
              <button
                onClick={startNextInnings}
                className="mt-4 rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
              >
                Start Innings {currentInn + 2} →
              </button>
            </GamePanel>
          )}

          <div className="mt-4">
            <Commentary log={inn.log} />
          </div>
        </>
      )}

      {phase === "result" && (
        <GamePanel title="Result">
          <ResultBlock
            myTeam={myTeam} opp={opp}
            innings={innings} myTeamName={myTeam}
            playerName={player.name}
          />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SquadList title={myTeam} squad={mySquad} highlight={player.name} />
            <SquadList title={opp} squad={oppSquad} />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate({ to: "/hub" })}
              className="rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground"
            >
              Return to Hub
            </button>
            <button
              onClick={() => navigate({ to: "/inbox" })}
              className="rounded-md border border-border px-6 py-2 text-display text-sm text-foreground"
            >
              Inbox
            </button>
          </div>
        </GamePanel>
      )}
    </GameShell>
  );
}

function Scoreboard({ title, runs, wickets, balls, totalOvers, target, muted }: {
  title: string; runs: number; wickets: number; balls: number;
  totalOvers: number; target?: number | null; muted?: boolean;
}) {
  const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
  const rr = balls > 0 ? ((runs / balls) * 6).toFixed(2) : "0.00";
  const rrr = target ? (
    balls < totalOvers * 6
      ? (((target - runs) / Math.max(1, totalOvers * 6 - balls)) * 6).toFixed(2)
      : "—"
  ) : null;
  return (
    <div className={`rounded-xl border p-4 ${muted ? "border-border bg-background/30" : "border-primary/40 bg-primary/5"}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="mt-1 text-display text-3xl text-foreground">{runs}<span className="text-lg text-muted-foreground">/{wickets}</span></p>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{overs} / {totalOvers} ov</span>
        <span>RR {rr}{rrr ? ` · RRR ${rrr}` : ""}</span>
      </div>
      {target ? <p className="mt-1 text-xs text-primary">Target: {target}</p> : null}
    </div>
  );
}

function PlayerCard({ name, runs, balls, fours, sixes, out, position }: {
  name: string; runs: number; balls: number; fours: number; sixes: number; out: boolean; position: number;
}) {
  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You — Batting · #{position}</p>
      <p className="mt-1 text-display text-2xl text-foreground">{name} <span className="text-display text-3xl text-primary">{runs}{!out ? "*" : ""}</span> <span className="text-sm text-muted-foreground">({balls})</span></p>
      <p className="mt-1 text-xs text-muted-foreground">SR {sr} · {fours}×4 · {sixes}×6</p>
      {out && <p className="mt-1 text-xs text-destructive">OUT — tail-enders finishing</p>}
    </div>
  );
}

function PartnerCard({ name, runs, balls, out }: { name: string; runs: number; balls: number; out: boolean }) {
  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Partner</p>
      <p className="mt-1 text-display text-lg text-foreground">{name} <span className="text-display text-2xl text-accent">{runs}{out ? "" : "*"}</span> <span className="text-sm text-muted-foreground">({balls})</span></p>
      <p className="mt-1 text-xs text-muted-foreground">SR {sr}</p>
    </div>
  );
}

function BowlerCard({ name, wickets, runs, balls, quota }: {
  name: string; wickets: number; runs: number; balls: number; quota: number;
}) {
  const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
  const econ = balls > 0 ? ((runs / balls) * 6).toFixed(2) : "0.00";
  return (
    <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{name} — Bowling</p>
      <p className="mt-1 text-display text-2xl text-foreground">{wickets}/{runs}</p>
      <p className="mt-1 text-xs text-muted-foreground">{overs} ov · Econ {econ} · Quota {quota / 6} ov</p>
    </div>
  );
}

function BattingPanel({ onShot, shotsDisabled, shotsLocked, waitingForPartner, canDeclare, onDeclare }: {
  onShot: (s: ShotType) => void;
  shotsDisabled: boolean;
  shotsLocked: boolean;
  waitingForPartner: boolean;
  canDeclare?: boolean;
  onDeclare?: () => void;
}) {
  const subtitle = shotsLocked
    ? "You're out — tail-enders finishing the innings"
    : waitingForPartner
      ? "Your partner is on strike..."
      : "The bowler is at the top of his run-up...";
  return (
    <GamePanel title="Choose Your Shot" subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {SHOTS.map((s) => (
          <button
            key={s}
            disabled={shotsDisabled}
            onClick={() => onShot(s)}
            className={`rounded-md border p-3 text-display text-xs transition-colors ${
              isAggressive(s)
                ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                : isDefensive(s)
                  ? "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            } disabled:cursor-not-allowed disabled:opacity-30`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Aggressive shots (red) score more but risk wickets. Match the shot to the length you expect. Strike rotates on 1s, 3s and end of over.
      </p>
      {canDeclare && onDeclare && (
        <button
          onClick={onDeclare}
          className="mt-3 w-full rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-display text-xs text-destructive hover:bg-destructive/20"
        >
          Declare Innings
        </button>
      )}
    </GamePanel>
  );
}

function isAggressive(s: ShotType): boolean { return ["Loft", "Slog", "Pull"].includes(s); }
function isDefensive(s: ShotType): boolean { return ["Leave", "Defend", "Block"].includes(s); }

function BowlingPanel({ choice, setChoice, deliveryOptions, canBowl, onBowl, quota, ballsBowled, aiBatter }: {
  choice: { delivery: DeliveryType; line: LinePos; length: LengthPos };
  setChoice: (c: { delivery: DeliveryType; line: LinePos; length: LengthPos }) => void;
  deliveryOptions: DeliveryType[];
  canBowl: boolean;
  onBowl: () => void;
  quota: number;
  ballsBowled: number;
  aiBatter: number;
}) {
  return (
    <GamePanel
      title="Pick Your Delivery"
      subtitle={`Batter #${aiBatter} on strike · You've bowled ${Math.floor(ballsBowled/6)}.${ballsBowled%6} of ${quota} overs`}
    >
      <div className="space-y-3">
        <SelectorRow label="Delivery" options={deliveryOptions as readonly string[]} value={choice.delivery} onChange={(v) => setChoice({ ...choice, delivery: v as DeliveryType })} />
        <SelectorRow label="Line" options={LINES as readonly string[]} value={choice.line} onChange={(v) => setChoice({ ...choice, line: v as LinePos })} />
        <SelectorRow label="Length" options={LENGTHS as readonly string[]} value={choice.length} onChange={(v) => setChoice({ ...choice, length: v as LengthPos })} />
      </div>
      <button
        disabled={!canBowl}
        onClick={onBowl}
        className="mt-4 w-full rounded-md bg-gradient-primary py-3 text-display text-sm text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canBowl ? "Bowl Ball →" : "Quota complete — partner finishes the innings"}
      </button>
    </GamePanel>
  );
}

function SelectorRow({ label, options, value, onChange }: {
  label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-6">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-md border px-2 py-2 text-xs transition-colors ${
              value === o
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Commentary({ log }: { log: BallOutcome[] }) {
  return (
    <GamePanel title="Live Commentary">
      <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {log.length === 0 && <li className="text-sm">Match about to begin...</li>}
        {log.map((o, i) => (
          <li key={i} className={`text-sm ${
            o.isWicket ? "text-destructive" : o.runs === 6 ? "text-primary" : o.runs === 4 ? "text-primary/80" : "text-foreground"
          }`}>
            <span className="mr-2 inline-block w-12 text-display text-xs text-muted-foreground">
              {o.isWicket ? "W" : o.isExtra ? `+${o.runs}` : o.runs}
            </span>
            {o.commentary}
          </li>
        ))}
      </ul>
    </GamePanel>
  );
}

function ResultBlock({ myTeam, opp, innings, playerName }: {
  myTeam: string; opp: string;
  innings: InningsState[]; myTeamName: string;
  playerName: string;
}) {
  const myInns = innings.filter((i) => i.battingTeam === myTeam);
  const oppInns = innings.filter((i) => i.battingTeam === opp);
  const myTotal = myInns.reduce((s, i) => s + i.runs, 0);
  const oppTotal = oppInns.reduce((s, i) => s + i.runs, 0);
  const won = myTotal > oppTotal;
  const tied = myTotal === oppTotal;
  const myRuns = myInns.reduce((s, i) => s + i.playerRuns, 0);
  const myBalls = myInns.reduce((s, i) => s + i.playerBalls, 0);
  const myFours = myInns.reduce((s, i) => s + i.playerFours, 0);
  const mySixes = myInns.reduce((s, i) => s + i.playerSixes, 0);
  const out = myInns.some((i) => i.playerOut);
  const wickets = innings.filter((i) => i.bowlingTeam === myTeam).reduce((s, i) => s + i.playerWicketsTaken, 0);
  const conceded = innings.filter((i) => i.bowlingTeam === myTeam).reduce((s, i) => s + i.playerRunsConceded, 0);
  const ballsBowled = innings.filter((i) => i.bowlingTeam === myTeam).reduce((s, i) => s + i.playerBallsBowled, 0);
  return (
    <div>
      <p className={`text-display text-2xl ${won ? "text-primary" : tied ? "text-secondary" : "text-destructive"}`}>
        {won ? `${myTeam} won!` : tied ? "Match Tied" : `${opp} won`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-background/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{myTeam}</p>
          <p className="text-display text-xl">{myTotal}{myInns.length > 1 ? ` (${myInns.length} inns)` : ""}</p>
        </div>
        <div className="rounded-md border border-border bg-background/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{opp}</p>
          <p className="text-display text-xl">{oppTotal}{oppInns.length > 1 ? ` (${oppInns.length} inns)` : ""}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="Your Runs" value={myRuns} accent />
        <StatBox label="Balls" value={myBalls} />
        <StatBox label="4s/6s" value={`${myFours}/${mySixes}`} />
        <StatBox label="Out" value={out ? "Yes" : "Not Out"} />
        <StatBox label="Wickets" value={wickets} accent />
        <StatBox label="Conceded" value={conceded} />
        <StatBox label="Overs" value={`${Math.floor(ballsBowled/6)}.${ballsBowled%6}`} />
        <StatBox label="Played" value={playerName.split(" ")[0]} />
      </div>
    </div>
  );
}

function SquadList({ title, squad, highlight }: { title: string; squad: RosterPlayer[]; highlight?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/30 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title} XI</p>
      <ul className="mt-2 space-y-1 text-xs">
        {squad.map((p) => (
          <li key={p.name} className={`flex items-baseline justify-between gap-2 ${p.name === highlight ? "text-primary" : "text-foreground"}`}>
            <span><span className="text-display">{p.name}</span> <span className="text-[10px] text-muted-foreground">· {p.role}</span></span>
            <span className="text-muted-foreground">{p.rating}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
