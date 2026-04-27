import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel, StatBox } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { mergeMatchStats } from "@/game/career";
import { maybeScoutOffer } from "@/game/scouts";
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

type DismissalKind = "Bowled" | "LBW" | "Caught" | "Stumped" | "Run Out";

interface BatterCard {
  name: string;
  isPlayer: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: DismissalKind;
  bowler?: string; // who got him out (bowler name)
  fielder?: string; // for caught/run out
  overBall?: string;
  scoreAtDismissal?: string;
  battedOrder: number; // 1..11 — order they walked in (0 = yet to bat)
}

interface BowlerCard {
  name: string;
  isPlayer: boolean;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  // Internal: track runs in current over to compute maidens
  _curOverRuns: number;
  _curOverBalls: number;
}

interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

interface DismissalDetail {
  wicket: number;
  batter: string;
  score: string;
  overBall: string;
  dismissal: DismissalKind;
  bowler?: string;
  fielder?: string;
  isPlayer: boolean;
  battingTeam: string;
}

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
  // FULL SCORECARD — every batter and bowler tracked individually
  batters: BatterCard[]; // length 11; order = squad order
  bowlers: BowlerCard[]; // length 11; only used ones get balls > 0
  battedCount: number; // how many batters have come to crease
  extras: ExtrasBreakdown;
}

const DISMISSAL_TYPES: DismissalKind[] = ["Bowled", "LBW", "Caught", "Stumped", "Run Out"];

const EMPTY_EXTRAS: ExtrasBreakdown = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };

function cloneExtras(extras?: ExtrasBreakdown): ExtrasBreakdown {
  return { ...EMPTY_EXTRAS, ...(extras ?? {}) };
}

function isLegalBall(o: BallOutcome): boolean {
  return !o.isExtra || o.extraType === "Bye" || o.extraType === "Leg Bye";
}

function overBallAfterDelivery(currentLegalBalls: number, o: BallOutcome): string {
  const ballNumber = currentLegalBalls + (isLegalBall(o) ? 1 : 0);
  return `${Math.floor(ballNumber / 6)}.${ballNumber % 6}`;
}

function pickFielderName(kind: DismissalKind, fieldingSquad: RosterPlayer[], bowlerName?: string): string | undefined {
  if (kind !== "Caught" && kind !== "Stumped" && kind !== "Run Out") return undefined;
  const options = fieldingSquad.filter((p) => p.name !== bowlerName);
  if (kind === "Stumped") return options.find((p) => p.role === "Wicket-Keeper Bat")?.name ?? options[0]?.name;
  return options[Math.floor(Math.random() * Math.max(1, options.length))]?.name ?? bowlerName;
}

function addExtras(ci: InningsState, o: BallOutcome) {
  if (!o.isExtra) return;
  if (o.extraType === "Wide") ci.extras.wides += o.runs;
  else if (o.extraType === "No Ball") ci.extras.noBalls += o.runs;
  else if (o.extraType === "Bye") ci.extras.byes += o.runs;
  else if (o.extraType === "Leg Bye") ci.extras.legByes += o.runs;
  else ci.extras.penalty += o.runs;
}

function extrasTotal(extras: ExtrasBreakdown): number {
  return extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;
}

function bowlerRunsCharged(o: BallOutcome): number {
  if (o.isExtra && (o.extraType === "Wide" || o.extraType === "No Ball")) return o.runs;
  if (o.isExtra) return 0;
  return o.runs;
}

function pickDismissal(bowlerIsSpin: boolean): DismissalKind {
  const r = Math.random();
  if (bowlerIsSpin) {
    if (r < 0.45) return "Caught";
    if (r < 0.65) return "LBW";
    if (r < 0.8) return "Bowled";
    if (r < 0.95) return "Stumped";
    return "Run Out";
  }
  if (r < 0.55) return "Caught";
  if (r < 0.75) return "Bowled";
  if (r < 0.92) return "LBW";
  return "Run Out";
}

function emptyBatters(squad: RosterPlayer[], playerName: string): BatterCard[] {
  return squad.slice(0, 11).map((p) => ({
    name: p.name,
    isPlayer: p.name === playerName,
    runs: 0, balls: 0, fours: 0, sixes: 0,
    out: false,
    battedOrder: 0,
  }));
}

function emptyBowlers(squad: RosterPlayer[], playerName: string): BowlerCard[] {
  // Bowlers — usually all 11 listed; only those who actually bowl get tracked
  return squad.slice(0, 11).map((p) => ({
    name: p.name,
    isPlayer: p.name === playerName,
    balls: 0, runs: 0, wickets: 0, maidens: 0,
    _curOverRuns: 0, _curOverBalls: 0,
  }));
}

function emptyInnings(
  batting: string, bowling: string,
  battingSquad: RosterPlayer[], bowlingSquad: RosterPlayer[],
  playerName: string,
  partnerName = "Partner",
): InningsState {
  return {
    battingTeam: batting, bowlingTeam: bowling,
    runs: 0, wickets: 0, balls: 0, log: [], declared: false,
    playerRuns: 0, playerBalls: 0, playerFours: 0, playerSixes: 0, playerOut: false,
    battingPosition: 1,
    partnerName, partnerRuns: 0, partnerBalls: 0, partnerOut: false,
    strikerIsPlayer: true,
    playerWicketsTaken: 0, playerRunsConceded: 0, playerBallsBowled: 0,
    batters: emptyBatters(battingSquad, playerName),
    bowlers: emptyBowlers(bowlingSquad, playerName),
    battedCount: 0,
    extras: { ...EMPTY_EXTRAS },
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

function isSpinRole(role: Role): boolean {
  return role === "Off-Spinner" || role === "Leg-Spinner";
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
  // Player is forced to their role's natural slot (so Top-Order opens, Bowler bats #9) — fixes the "instant top-order" glitch.
  const myBattingOrder = useMemo<RosterPlayer[]>(() => {
    const others = mySquad.filter((p) => p.name !== save.player.name);
    others.sort((a, b) => battingPositionForRole(a.role) - battingPositionForRole(b.role));
    const me: RosterPlayer = { name: save.player.name, role: save.player.role, rating: 75 };
    const order: RosterPlayer[] = [];
    let othersIdx = 0;
    for (let pos = 1; pos <= 11; pos++) {
      if (pos === playerBatPos && !order.includes(me)) {
        order.push(me);
      } else {
        order.push(others[othersIdx++] ?? me);
      }
    }
    return order;
  }, [mySquad, save.player.name, save.player.role, playerBatPos]);

  // Opposition batting order — sorted by role
  const oppBattingOrder = useMemo<RosterPlayer[]>(() => {
    const order = [...oppSquad];
    order.sort((a, b) => battingPositionForRole(a.role) - battingPositionForRole(b.role));
    return order.slice(0, 11);
  }, [oppSquad]);

  // Bowling pools (only bowler-types from the opposing squad bowl)
  const myBowlersPool = useMemo<RosterPlayer[]>(() => {
    return mySquad.filter((p) => isBowler || isAR ? true : ["Pace Bowler", "Swing Bowler", "Off-Spinner", "Leg-Spinner", "All-Rounder"].includes(p.role));
  }, [mySquad, isBowler, isAR]);
  const oppBowlersPool = useMemo<RosterPlayer[]>(() => {
    return oppSquad.filter((p) => ["Pace Bowler", "Swing Bowler", "Off-Spinner", "Leg-Spinner", "All-Rounder"].includes(p.role));
  }, [oppSquad]);

  // ---- Toss + match phase ----
  const snap = save.matchInProgress && save.matchInProgress.fixtureId === fixture.id ? save.matchInProgress : null;

  const [phase, setPhase] = useState<Phase>(snap ? snap.phase as Phase : "toss");
  const [tossWon] = useState(() => snap ? snap.tossWon : Math.random() < 0.5);
  const [tossChoice, setTossChoice] = useState<"bat" | "bowl" | null>(snap ? snap.tossChoice : null);
  const [battingFirst, setBattingFirst] = useState<boolean>(snap ? snap.battingFirst : true);
  // Tab on result screen
  const [scorecardTab, setScorecardTab] = useState<0 | 1>(0);
  const [dismissalDetail, setDismissalDetail] = useState<DismissalDetail | null>(null);
  const shownDismissalKeys = useRef<Set<string>>(new Set());

  const [innings, setInnings] = useState<InningsState[]>(() => {
    if (snap) {
      // Hydrate without scorecard (legacy snapshot) — re-init batters/bowlers if missing
      return snap.innings.map((i) => {
        const battingSq = i.battingTeam === myTeam ? mySquad : oppSquad;
        const bowlingSq = i.bowlingTeam === myTeam ? mySquad : oppSquad;
        const anyI = i as unknown as Partial<InningsState>;
        return {
          ...i,
          declared: anyI.declared ?? false,
          partnerOut: false,
          batters: anyI.batters ?? emptyBatters(battingSq, save.player.name),
          bowlers: anyI.bowlers ?? emptyBowlers(bowlingSq, save.player.name),
          battedCount: anyI.battedCount ?? 0,
          extras: anyI.extras ?? { ...EMPTY_EXTRAS },
        } as InningsState;
      });
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
      const isFirstBatTeam = i % 2 === 0;
      const battingTeam = (isFirstBatTeam && usBatFirst) || (!isFirstBatTeam && !usBatFirst) ? myTeam : opp;
      const bowlingTeam = battingTeam === myTeam ? opp : myTeam;
      const battingSq = battingTeam === myTeam ? mySquad : oppSquad;
      const bowlingSq = bowlingTeam === myTeam ? mySquad : oppSquad;
      const partnerStart = battingTeam === myTeam ? partnerForPosition(2) : "—";
      list.push(emptyInnings(battingTeam, bowlingTeam, battingSq, bowlingSq, save.player.name, partnerStart));
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

  // Queue of dismissals to surface in the modal — pushed by recordBallToScorecard
  const dismissalQueueRef = useRef<DismissalDetail[]>([]);

  // Drain the queue whenever wickets count changes
  useEffect(() => {
    if (!inn || (phase !== "batting" && phase !== "bowling")) return;
    if (dismissalQueueRef.current.length === 0) return;
    const next = dismissalQueueRef.current.shift();
    if (next) setDismissalDetail(next);
  }, [inn?.wickets, currentInn, phase, inn]);


  // For bowling phase
  const [aiBatterRating, setAiBatterRating] = useState(() => 50 + Math.floor(Math.random() * 25));
  const [aiBatterIdx, setAiBatterIdx] = useState(1);
  const [bowlingChoice, setBowlingChoice] = useState<{ delivery: DeliveryType; line: LinePos; length: LengthPos }>({ delivery: "Stock", line: "Stump", length: "Good" });
  const isPaceRole = ["Pace Bowler", "Swing Bowler"].includes(player.role) || isAR;
  const deliveryOptions = isPaceRole ? DELIVERIES_BY_TYPE.pace : DELIVERIES_BY_TYPE.spin;

  function startInnings() {
    if (!inn) return;
    if (isMyBatting) {
      simUntilPlayerComes(currentInn);
      setPhase("batting");
    } else {
      setPhase("bowling");
    }
  }

  // -------- Helper: pick a bowler for the AI side this over --------
  function pickAiBowler(ci: InningsState, pool: RosterPlayer[]): { name: string; spin: boolean } {
    if (pool.length === 0) return { name: ci.bowlingTeam + " bowler", spin: false };
    // Rotate based on over number
    const overNum = Math.floor(ci.balls / 6);
    // Limit each bowler to ~ overs/5 in limited overs, no cap in tests
    const candidate = pool[overNum % pool.length];
    return { name: candidate.name, spin: isSpinRole(candidate.role) };
  }

  // -------- Helper: record a ball into the scorecard --------
  // Mutates ci in place. After running, ci.runs and ci.wickets are recomputed
  // from the per-batter scorecard + extras so the team total can never disagree.
  function recordBallToScorecard(
    ci: InningsState,
    o: BallOutcome,
    striker: { name: string; isPlayer: boolean } | null,
    bowler: { name: string; isPlayer: boolean } | null,
    fieldingSquad: RosterPlayer[],
  ): void {
    const legal = isLegalBall(o);
    const overBall = overBallAfterDelivery(ci.balls, o);
    addExtras(ci, o);
    // Update bowler stats (legal balls only)
    if (bowler) {
      let bw = ci.bowlers.find((b) => b.name === bowler.name);
      if (!bw) {
        bw = {
          name: bowler.name,
          isPlayer: bowler.isPlayer,
          balls: 0, runs: 0, wickets: 0, maidens: 0,
          _curOverRuns: 0, _curOverBalls: 0,
        };
        ci.bowlers.push(bw);
      }
      if (legal) {
        bw.balls += 1;
        bw._curOverBalls += 1;
      }
      // wides/no-balls add to bowler runs in real cricket (extras), but byes/leg-byes don't
      if (o.isExtra && (o.extraType === "Wide" || o.extraType === "No Ball")) {
        bw.runs += o.runs;
        bw._curOverRuns += o.runs;
      } else if (!o.isExtra) {
        bw.runs += o.runs;
        bw._curOverRuns += o.runs;
      }
      if (o.isWicket && o.wicketType !== "Run Out") {
        bw.wickets += 1;
      }
      // End of over → maiden check
      if (bw._curOverBalls >= 6) {
        if (bw._curOverRuns === 0) bw.maidens += 1;
        bw._curOverRuns = 0;
        bw._curOverBalls = 0;
      }
    }
    // Update batter stats
    if (striker && !o.isExtra) {
      const bt = ci.batters.find((b) => b.name === striker.name);
      if (bt) {
        bt.balls += 1;
        bt.runs += o.runs;
        if (o.runs === 4) bt.fours += 1;
        if (o.runs === 6) bt.sixes += 1;
        if (o.isWicket) {
          bt.out = true;
          bt.dismissal = (o.wicketType ?? "Bowled") as DismissalKind;
          bt.bowler = bowler && bt.dismissal !== "Run Out" ? bowler.name : undefined;
          bt.fielder = pickFielderName(bt.dismissal, fieldingSquad, bowler?.name);
          bt.overBall = overBall;
          // score-at-dismissal will be recomputed below after we sync ci.runs
          const wicketNum = ci.batters.filter((b) => b.out).length;
          dismissalQueueRef.current.push({
            wicket: wicketNum,
            batter: bt.name,
            score: "", // filled in after recompute
            overBall,
            dismissal: bt.dismissal,
            bowler: bt.bowler,
            fielder: bt.fielder,
            isPlayer: bt.isPlayer,
            battingTeam: ci.battingTeam,
          });
        }
      }
    } else if (striker && o.isExtra && o.isWicket) {
      // run-out off an extra (rare) — still mark the batter
      const bt = ci.batters.find((b) => b.name === striker.name);
      if (bt) {
        bt.out = true;
        bt.dismissal = "Run Out";
        bt.fielder = pickFielderName("Run Out", fieldingSquad, bowler?.name);
        bt.overBall = overBall;
        const wicketNum = ci.batters.filter((b) => b.out).length;
        dismissalQueueRef.current.push({
          wicket: wicketNum,
          batter: bt.name,
          score: "",
          overBall,
          dismissal: "Run Out",
          fielder: bt.fielder,
          isPlayer: bt.isPlayer,
          battingTeam: ci.battingTeam,
        });
      }
    }
    // ---- Single source of truth: derive team totals from scorecard ----
    const battersRuns = ci.batters.reduce((s, b) => s + b.runs, 0);
    ci.runs = battersRuns + extrasTotal(ci.extras);
    ci.wickets = ci.batters.filter((b) => b.out).length;
    // Patch any pending dismissal entries with the now-correct score string
    for (const d of dismissalQueueRef.current) {
      if (!d.score) d.score = `${ci.runs}/${ci.wickets}`;
    }
    // Mirror the latest dismissal score into the batter's card too
    const latestOut = ci.batters.find((b) => b.out && b.overBall === overBall);
    if (latestOut) latestOut.scoreAtDismissal = `${ci.runs}/${ci.wickets}`;
  }

  // -------- Mark a batter as having walked in (assigns batted order) --------
  function markBatterIn(ci: InningsState, name: string) {
    const bt = ci.batters.find((b) => b.name === name);
    if (bt && bt.battedOrder === 0) {
      ci.battedCount += 1;
      bt.battedOrder = ci.battedCount;
    }
  }

  // Sim balls (with partner script) until the player walks to the crease
  // FIX: Accept explicit innings index so we never write to a stale currentInn.
  function simUntilPlayerComes(targetInnIdx: number) {
    setInnings((all) => {
      if (!all[targetInnIdx]) return all;
      const next = [...all];
      const ci = { ...next[targetInnIdx] };
      // Deep-clone scorecard arrays so we can mutate
      ci.batters = ci.batters.map((b) => ({ ...b }));
      ci.bowlers = ci.bowlers.map((b) => ({ ...b }));
      ci.extras = cloneExtras(ci.extras);

      // Mark openers in
      const battingSq = ci.battingTeam === myTeam ? myBattingOrder : oppBattingOrder;
      if (battingSq[0]) markBatterIn(ci, battingSq[0].name);
      if (battingSq[1]) markBatterIn(ci, battingSq[1].name);

      const bowlingPool = ci.bowlingTeam === myTeam ? myBowlersPool : oppBowlersPool;

      if (playerBatPos <= 1) {
        // Player IS the opener — no sim needed
        ci.battingPosition = 1;
        ci.partnerName = battingSq[1]?.name ?? partnerForPosition(2);
        next[targetInnIdx] = ci;
        return next;
      }

      // Sim wickets until enough have fallen so player at position playerBatPos is next in
      let safety = 1500;
      let nextBatterIdx = 2; // openers are 0,1 → next in is index 2
      while (ci.wickets < playerBatPos - 1 && safety-- > 0) {
        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.06) isWicket = true;
        else if (r < 0.5) runs = 0;
        else if (r < 0.78) runs = 1;
        else if (r < 0.88) runs = 2;
        else if (r < 0.96) runs = 4;
        else runs = 6;

        // Determine current striker — whichever opener/incoming batter is at top-of-order and not out
        const liveBatters = ci.batters.filter((b) => b.battedOrder > 0 && !b.out);
        const striker = liveBatters[0] ?? null;
        const bw = pickAiBowler(ci, bowlingPool);
        const bowler = bw ? { name: bw.name, isPlayer: false } : null;
        const fieldingSq = ci.bowlingTeam === myTeam ? mySquad : oppSquad;

        let outcome: BallOutcome;
        if (isWicket) {
          const dis = pickDismissal(bw.spin);
          outcome = {
            runs: 0, isWicket: true, wicketType: dis,
            isBoundary: false, isExtra: false,
            commentary: `${striker?.name ?? "Batter"} ${dis === "Bowled" ? "bowled" : dis === "LBW" ? "trapped LBW" : dis === "Caught" ? "caught" : dis === "Stumped" ? "stumped" : "run out"} — ${bw.name}.`,
            wicket: undefined,
          } as BallOutcome;
        } else {
          outcome = {
            runs, isWicket: false, isBoundary: runs === 4 || runs === 6, isExtra: false,
            commentary: runs === 0 ? `Dot.` : runs >= 4 ? `Boundary!` : `${runs} run${runs>1?"s":""}.`,
          };
        }

        recordBallToScorecard(ci, outcome, striker ? { name: striker.name, isPlayer: false } : null, bowler, fieldingSq);

        ci.balls += 1;
        ci.runs += runs;
        if (isWicket) {
          ci.wickets += 1;
          // Bring next batter in (unless this wicket is the one that brings the player in)
          if (ci.wickets < playerBatPos - 1 && battingSq[nextBatterIdx]) {
            markBatterIn(ci, battingSq[nextBatterIdx].name);
            nextBatterIdx += 1;
          }
        }
      }

      // Now player walks in
      ci.battingPosition = ci.wickets + 1;
      markBatterIn(ci, save.player.name);
      // Partner is the OTHER batter still at the crease (the opener / earlier batter who wasn't out)
      const stillIn = ci.batters.find((b) => b.battedOrder > 0 && !b.out && b.name !== save.player.name);
      ci.partnerName = stillIn?.name ?? partnerForPosition(ci.wickets + 2);
      ci.partnerRuns = stillIn?.runs ?? 0;
      ci.partnerBalls = stillIn?.balls ?? 0;
      ci.partnerOut = false;
      ci.strikerIsPlayer = true;
      ci.log = [{
        runs: 0, isWicket: false, isBoundary: false, isExtra: false,
        commentary: `${save.player.name} walks to the crease at #${ci.battingPosition} — joins ${ci.partnerName}.`,
      }, ...ci.log].slice(0, 25);
      next[targetInnIdx] = ci;
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
      ctx: {
        format: fixture.format,
        ballsRemaining: Math.max(0, oversPerInnings * 6 - inn.balls),
        runsNeeded: target ? Math.max(0, target - inn.runs) : undefined,
        wicketsDown: inn.wickets,
      },
    });
    applyStrikerBall(outcome, true);
  }

  // applyStrikerBall: if the player is on strike, results count for them; otherwise for partner.
  function applyStrikerBall(o: BallOutcome, fromPlayer: boolean) {
    setInnings((all) => {
      const next = [...all];
      const ci = { ...next[currentInn], log: [o, ...next[currentInn].log].slice(0, 25) };
      ci.batters = ci.batters.map((b) => ({ ...b }));
      ci.bowlers = ci.bowlers.map((b) => ({ ...b }));
      ci.extras = cloneExtras(ci.extras);

      const onStrikeIsPlayer = ci.strikerIsPlayer;

      // Run-out chance on a 2 (rare) — applies to whoever ran
      let runOut = false;
      if (!o.isWicket && !o.isExtra && o.runs === 2 && Math.random() < 0.04) {
        runOut = true;
      }

      // Determine bowler for scorecard — pick from opposition pool
      const bowlingPool = ci.bowlingTeam === myTeam ? myBowlersPool : oppBowlersPool;
      const bw = pickAiBowler(ci, bowlingPool);
      const bowlerEntry = { name: bw.name, isPlayer: false };

      // Build dismissal type if the wicket is from the bowler (not run-out)
      let outcomeForCard: BallOutcome = o;
      if (o.isWicket && !o.wicketType) {
        const dis = pickDismissal(bw.spin);
        outcomeForCard = { ...o, wicketType: dis };
      }
      if (runOut) {
        outcomeForCard = {
          ...outcomeForCard, isWicket: true, wicketType: "Run Out", runs: 1,
        };
      }

      // Identify striker name for scorecard
      const strikerName = onStrikeIsPlayer ? save.player.name : ci.partnerName;
      const strikerEntry = { name: strikerName, isPlayer: onStrikeIsPlayer };
      const fieldingSq = ci.bowlingTeam === myTeam ? mySquad : oppSquad;

      recordBallToScorecard(ci, outcomeForCard, strikerEntry, bowlerEntry, fieldingSq);

      ci.runs += outcomeForCard.runs;
      if (isLegalBall(outcomeForCard)) ci.balls += 1;

      if (onStrikeIsPlayer && fromPlayer) {
        if (!outcomeForCard.isExtra) {
          ci.playerBalls += 1;
          ci.playerRuns += outcomeForCard.runs;
          if (outcomeForCard.runs === 4) ci.playerFours += 1;
          if (outcomeForCard.runs === 6) ci.playerSixes += 1;
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
        if (!outcomeForCard.isExtra) {
          ci.partnerBalls += 1;
          ci.partnerRuns += outcomeForCard.runs;
        }
        if (o.isWicket || runOut) {
          ci.wickets += 1;
          ci.partnerOut = true;
          // Bring next partner in if more wickets allowed and player still in
          if (ci.wickets < 10 && !ci.playerOut) {
            const battingSq = ci.battingTeam === myTeam ? myBattingOrder : oppBattingOrder;
            // Next batter = first squad member with no battedOrder yet
            const nextSquadMember = battingSq.find((p) => {
              const bc = ci.batters.find((b) => b.name === p.name);
              return bc && bc.battedOrder === 0;
            });
            const nextPartnerName = nextSquadMember?.name ?? partnerForPosition(ci.wickets + 1);
            markBatterIn(ci, nextPartnerName);
            ci.partnerName = nextPartnerName;
            ci.partnerRuns = 0; ci.partnerBalls = 0; ci.partnerOut = false;
            ci.log = [{
              runs: 0, isWicket: false, isBoundary: false, isExtra: false,
              commentary: `${nextPartnerName} walks in to join ${save.player.name}.`,
            }, ...ci.log].slice(0, 25);
          }
        }
      }
      // Strike rotation: odd runs swap; end of over swaps too
      if (!outcomeForCard.isExtra && !outcomeForCard.isWicket && (outcomeForCard.runs === 1 || outcomeForCard.runs === 3)) {
        ci.strikerIsPlayer = !ci.strikerIsPlayer;
      }
      if (isLegalBall(outcomeForCard) && (ci.balls % 6 === 0)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inn?.balls, inn?.strikerIsPlayer, inn?.playerOut, oversPerInnings, target]);

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
        ci.batters = ci.batters.map((b) => ({ ...b }));
        ci.bowlers = ci.bowlers.map((b) => ({ ...b }));
        ci.extras = cloneExtras(ci.extras);

        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.07) isWicket = true;
        else if (r < 0.55) runs = 0;
        else if (r < 0.8) runs = 1;
        else if (r < 0.88) runs = 2;
        else if (r < 0.96) runs = 4;
        else runs = 6;

        const battingSq = ci.battingTeam === myTeam ? myBattingOrder : oppBattingOrder;
        // Find first not-out batter in batted order
        const liveBatters = ci.batters.filter((b) => b.battedOrder > 0 && !b.out);
        const striker = liveBatters[0] ?? null;
        const bowlingPool = ci.bowlingTeam === myTeam ? myBowlersPool : oppBowlersPool;
        const bw = pickAiBowler(ci, bowlingPool);

        const outcome: BallOutcome = isWicket ? {
          runs: 0, isWicket: true, wicketType: pickDismissal(bw.spin),
          isBoundary: false, isExtra: false,
          commentary: `Tail-ender falls.`,
        } : {
          runs, isWicket: false, isBoundary: runs === 4 || runs === 6, isExtra: false,
          commentary: runs === 0 ? `Dot.` : runs >= 4 ? `Tail-ender pumps it!` : `${runs} taken.`,
        };

        const fieldingSq = ci.bowlingTeam === myTeam ? mySquad : oppSquad;
        recordBallToScorecard(ci, outcome, striker ? { name: striker.name, isPlayer: false } : null, { name: bw.name, isPlayer: false }, fieldingSq);

        ci.log = [outcome, ...ci.log].slice(0, 25);
        ci.runs += outcome.runs;
        if (isLegalBall(outcome)) ci.balls += 1;
        if (outcome.isWicket) {
          ci.wickets += 1;
          // Bring next tail-ender in
          const nextSquadMember = battingSq.find((p) => {
            const bc = ci.batters.find((b) => b.name === p.name);
            return bc && bc.battedOrder === 0;
          });
          if (nextSquadMember) markBatterIn(ci, nextSquadMember.name);
        }
        next[currentInn] = ci;
        return next;
      });
    }, 220);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      ctx: {
        format: fixture.format,
        ballsRemaining: Math.max(0, oversPerInnings * 6 - inn.balls),
        runsNeeded: target ? Math.max(0, target - inn.runs) : undefined,
        wicketsDown: inn.wickets,
        bowlerWicketsTaken: inn.playerWicketsTaken,
      },
    });
    setInnings((all) => {
      const next = [...all];
      const ci = { ...next[currentInn], log: [outcome, ...next[currentInn].log].slice(0, 25) };
      ci.batters = ci.batters.map((b) => ({ ...b }));
      ci.bowlers = ci.bowlers.map((b) => ({ ...b }));
      ci.extras = cloneExtras(ci.extras);

      // Determine the AI striker (first not-out batter in batted order, or bring in opener if none yet)
      const battingSq = ci.battingTeam === myTeam ? myBattingOrder : oppBattingOrder;
      // Ensure openers are marked in
      if (ci.battedCount === 0) {
        if (battingSq[0]) markBatterIn(ci, battingSq[0].name);
        if (battingSq[1]) markBatterIn(ci, battingSq[1].name);
      }
      let liveBatters = ci.batters.filter((b) => b.battedOrder > 0 && !b.out);
      if (liveBatters.length < 2) {
        const next2 = battingSq.find((p) => {
          const bc = ci.batters.find((b) => b.name === p.name);
          return bc && bc.battedOrder === 0;
        });
        if (next2) markBatterIn(ci, next2.name);
        liveBatters = ci.batters.filter((b) => b.battedOrder > 0 && !b.out);
      }
      const striker = liveBatters[0] ?? null;

      // Add wicket type if missing
      let outcomeForCard = outcome;
      if (outcome.isWicket && !outcome.wicketType) {
        const dis = pickDismissal(isSpinRole(player.role));
        outcomeForCard = { ...outcome, wicketType: dis };
      }

      const fieldingSq = ci.bowlingTeam === myTeam ? mySquad : oppSquad;
      recordBallToScorecard(ci, outcomeForCard,
        striker ? { name: striker.name, isPlayer: false } : null,
        { name: save.player.name, isPlayer: true }, fieldingSq);

      ci.runs += outcome.runs;
      if (isLegalBall(outcomeForCard)) {
        ci.balls += 1;
        ci.playerBallsBowled += 1;
      }
      ci.playerRunsConceded += bowlerRunsCharged(outcomeForCard);
      if (outcome.isWicket) {
        ci.wickets += 1;
        ci.playerWicketsTaken += 1;
        // Bring next batter in
        const nextSquadMember = battingSq.find((p) => {
          const bc = ci.batters.find((b) => b.name === p.name);
          return bc && bc.battedOrder === 0;
        });
        if (nextSquadMember) markBatterIn(ci, nextSquadMember.name);
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
        ci.batters = ci.batters.map((b) => ({ ...b }));
        ci.bowlers = ci.bowlers.map((b) => ({ ...b }));
        ci.extras = cloneExtras(ci.extras);

        const r = Math.random();
        let runs = 0; let isWicket = false;
        if (r < 0.045) isWicket = true;
        else if (r < 0.5) runs = 0;
        else if (r < 0.78) runs = 1;
        else if (r < 0.86) runs = 2;
        else if (r < 0.95) runs = 4;
        else runs = 6;

        const battingSq = ci.battingTeam === myTeam ? myBattingOrder : oppBattingOrder;
        if (ci.battedCount === 0) {
          if (battingSq[0]) markBatterIn(ci, battingSq[0].name);
          if (battingSq[1]) markBatterIn(ci, battingSq[1].name);
        }
        const liveBatters = ci.batters.filter((b) => b.battedOrder > 0 && !b.out);
        const striker = liveBatters[0] ?? null;
        // AI bowling partner — pick from our pool excluding the player
        const partnerPool = myBowlersPool.filter((p) => p.name !== save.player.name);
        const bw = pickAiBowler(ci, partnerPool.length ? partnerPool : myBowlersPool);

        const outcome: BallOutcome = isWicket ? {
          runs: 0, isWicket: true, wicketType: pickDismissal(bw.spin),
          isBoundary: false, isExtra: false,
          commentary: `Partner takes a wicket!`,
        } : {
          runs, isWicket: false, isBoundary: runs === 4 || runs === 6, isExtra: false,
          commentary: runs === 0 ? `Dot.` : runs >= 4 ? `Conceded a boundary.` : `${runs} run${runs>1?"s":""} given.`,
        };

        const fieldingSq = ci.bowlingTeam === myTeam ? mySquad : oppSquad;
        recordBallToScorecard(ci, outcome,
          striker ? { name: striker.name, isPlayer: false } : null,
          { name: bw.name, isPlayer: false }, fieldingSq);

        ci.log = [outcome, ...ci.log].slice(0, 25);
        ci.runs += outcome.runs;
        if (isLegalBall(outcome)) ci.balls += 1;
        if (outcome.isWicket) {
          ci.wickets += 1;
          const nextSquadMember = battingSq.find((p) => {
            const bc = ci.batters.find((b) => b.name === p.name);
            return bc && bc.battedOrder === 0;
          });
          if (nextSquadMember) markBatterIn(ci, nextSquadMember.name);
        }
        next[currentInn] = ci;
        return next;
      });
    }, 200);
    return () => { clearInterval(interval); simInProgress.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inn?.playerBallsBowled, inn?.balls, inn?.wickets, oversPerInnings, playerBowlsOvers, target, currentInn]);

  // Test day tracking — bump day when 90 overs of innings consumed
  useEffect(() => {
    if (!isTest || !inn) return;
    const newDay = Math.floor(inn.balls / 6 / oversPerDay) + 1;
    if (newDay !== day) setDay(newDay);
  }, [isTest, inn?.balls, oversPerDay, day, inn]);

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
      if (nextIdx === 3) {
        const i1 = innings[0]; const i2 = innings[1]; const i3 = innings[2];
        const fourthBat = innings.length > 3 ? innings[3].battingTeam : "";
        const total1 = i1.battingTeam === fourthBat ? i1.runs + (i3.battingTeam === fourthBat ? i3.runs : 0) : (i3.battingTeam === fourthBat ? i3.runs : 0);
        const total2 = i2.battingTeam === fourthBat ? 0 : (i1.battingTeam !== fourthBat ? i1.runs : 0) + (i3.battingTeam !== fourthBat ? i3.runs : 0);
        const totalAgainst = i2.battingTeam !== fourthBat ? i2.runs : 0;
        const chasing = total1;
        const conceded = totalAgainst + total2;
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
      // FIX: pass nextIdx explicitly so we don't write to stale currentInn
      simUntilPlayerComes(nextIdx);
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
    const scoutMsg = maybeScoutOffer(save, {
      runs: myRuns,
      balls: myBalls,
      wickets,
      runsConceded,
      ballsBowled,
      out: myOut,
    });
    const newSave: SaveGame = {
      ...save,
      stats: newStats,
      seasonStats: newSeasonStats,
      player: { ...save.player, confidence: conf, morale: mor, fitness: Math.max(20, save.player.fitness - 6) },
      fixtures: save.fixtures.map((f) => f.id === fixture.id ? { ...f, played: true } : f),
      matchInProgress: null,
      inbox: [
        ...(scoutMsg ? [scoutMsg] : []),
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
        declared: i.declared,
        batters: i.batters,
        bowlers: i.bowlers,
        battedCount: i.battedCount,
        extras: i.extras,
        fallOfWickets: i.fallOfWickets,
      })),
      currentInnings: currentInn,
      target,
      phase: phase as "intro" | "batting" | "bowling" | "innings-break" | "result",
      startedAt: snap?.startedAt ?? Date.now(),
    };
    const updated: SaveGame = { ...save, matchInProgress: snapshot };
    writeSave(updated);
  }, [phase, innings, currentInn, target, day, fixture, tossWon, tossChoice, battingFirst, save, snap]);

  useEffect(() => {
    if (phase === "result") return;
    const t = setTimeout(persistSnapshot, 350);
    return () => clearTimeout(t);
  }, [innings, phase, currentInn, persistSnapshot]);

  // ---------- Render ----------
  return (
    <GameShell>
      {dismissalDetail && (
        <DismissalDetailModal
          detail={dismissalDetail}
          onClose={() => setDismissalDetail(null)}
        />
      )}

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
              <BowlerSelfCard
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
        <>
          <GamePanel title="Result">
            <ResultBlock
              myTeam={myTeam} opp={opp}
              innings={innings} myTeamName={myTeam}
              playerName={player.name}
            />
          </GamePanel>

          {/* SCORECARDS — tabbed for each team */}
          <div className="mt-6">
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setScorecardTab(0)}
                className={`rounded-md border px-4 py-2 text-display text-xs transition-colors ${
                  scorecardTab === 0
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {myTeam} Scorecard
              </button>
              <button
                onClick={() => setScorecardTab(1)}
                className={`rounded-md border px-4 py-2 text-display text-xs transition-colors ${
                  scorecardTab === 1
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opp} Scorecard
              </button>
            </div>

            {scorecardTab === 0 && (
              <TeamScorecard
                teamName={myTeam}
                playerName={player.name}
                battingInnings={innings.filter((i) => i.battingTeam === myTeam)}
                bowlingInningsAgainstUs={innings.filter((i) => i.bowlingTeam === myTeam)}
                fullSquadBatting={myBattingOrder}
                onDismissalSelect={(detail) => setDismissalDetail({ ...detail, battingTeam: myTeam })}
              />
            )}
            {scorecardTab === 1 && (
              <TeamScorecard
                teamName={opp}
                playerName={player.name}
                battingInnings={innings.filter((i) => i.battingTeam === opp)}
                bowlingInningsAgainstUs={innings.filter((i) => i.bowlingTeam === opp)}
                fullSquadBatting={oppBattingOrder}
                onDismissalSelect={(detail) => setDismissalDetail({ ...detail, battingTeam: opp })}
              />
            )}
          </div>

          <div className="mt-6 flex gap-3">
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
        </>
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

function BowlerSelfCard({ name, wickets, runs, balls, quota }: {
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

function DismissalDetailModal({ detail, onClose }: { detail: DismissalDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-elegant">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-destructive">Wicket {detail.wicket}</p>
            <h2 className="text-display text-xl text-foreground">{detail.batter} out</h2>
          </div>
          <button onClick={onClose} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <DetailPill label="Team" value={detail.battingTeam} />
          <DetailPill label="Over" value={detail.overBall} />
          <DetailPill label="Score" value={detail.score} />
          <DetailPill label="Dismissal" value={detail.dismissal} />
          <DetailPill label="Bowler" value={detail.bowler ?? "—"} />
          <DetailPill label="Fielder" value={detail.fielder ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/30 p-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-display text-sm text-foreground">{value}</p>
    </div>
  );
}

// ---------- FULL TEAM SCORECARD ----------

function TeamScorecard({
  teamName, playerName, battingInnings, bowlingInningsAgainstUs, fullSquadBatting, onDismissalSelect,
}: {
  teamName: string;
  playerName: string;
  battingInnings: InningsState[]; // innings where THIS team batted
  bowlingInningsAgainstUs: InningsState[]; // innings where THIS team bowled
  fullSquadBatting: RosterPlayer[];
  onDismissalSelect: (detail: FallOfWicket) => void;
}) {
  return (
    <div className="space-y-6">
      {battingInnings.map((inn, idx) => (
        <BattingScorecardTable
          key={`bat-${idx}`}
          inn={inn}
          title={`${teamName} Batting${battingInnings.length > 1 ? ` — Innings ${idx + 1}` : ""}`}
          playerName={playerName}
          fullSquad={fullSquadBatting}
          onDismissalSelect={onDismissalSelect}
        />
      ))}
      {bowlingInningsAgainstUs.map((inn, idx) => (
        <BowlingScorecardTable
          key={`bowl-${idx}`}
          inn={inn}
          title={`${teamName} Bowling${bowlingInningsAgainstUs.length > 1 ? ` — Innings ${idx + 1}` : ""}`}
          playerName={playerName}
        />
      ))}
    </div>
  );
}

function dismissalText(b: BatterCard): string {
  if (!b.out) return b.battedOrder === 0 ? "yet to bat" : "not out";
  switch (b.dismissal) {
    case "Bowled": return `b ${b.bowler ?? ""}`;
    case "LBW": return `lbw b ${b.bowler ?? ""}`;
    case "Caught": return `c ${b.fielder ?? "fielder"} b ${b.bowler ?? ""}`;
    case "Stumped": return `st ${b.fielder ?? "keeper"} b ${b.bowler ?? ""}`;
    case "Run Out": return `run out ${b.fielder ? `(${b.fielder})` : ""}`;
    default: return "out";
  }
}

function BattingScorecardTable({
  inn, title, playerName, fullSquad, onDismissalSelect,
}: {
  inn: InningsState;
  title: string;
  playerName: string;
  fullSquad: RosterPlayer[];
  onDismissalSelect: (detail: FallOfWicket) => void;
}) {
  // Order: by battedOrder (1..n), then yet-to-bat by squad order
  const rows = [...inn.batters].sort((a, b) => {
    if (a.battedOrder === 0 && b.battedOrder === 0) {
      return fullSquad.findIndex((p) => p.name === a.name) - fullSquad.findIndex((p) => p.name === b.name);
    }
    if (a.battedOrder === 0) return 1;
    if (b.battedOrder === 0) return -1;
    return a.battedOrder - b.battedOrder;
  });
  const totalRuns = inn.runs;
  const totalWkts = inn.wickets;
  const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-elegant">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-display text-base text-foreground">{title}</h3>
        <p className="text-display text-sm text-primary">{totalRuns}/{totalWkts} <span className="text-xs text-muted-foreground">({overs} ov)</span></p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="py-1.5 pr-2">Batter</th>
              <th className="py-1.5 pr-2">Dismissal</th>
              <th className="py-1.5 pr-2 text-right">R</th>
              <th className="py-1.5 pr-2 text-right">B</th>
              <th className="py-1.5 pr-2 text-right">4s</th>
              <th className="py-1.5 pr-2 text-right">6s</th>
              <th className="py-1.5 text-right">SR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—";
              const isYetToBat = b.battedOrder === 0;
              return (
                <tr
                  key={b.name}
                  className={`border-b border-border/40 ${b.name === playerName ? "bg-primary/10" : ""} ${isYetToBat ? "opacity-50" : ""}`}
                >
                  <td className="py-1.5 pr-2 text-display">
                    {b.name}{b.name === playerName ? " (you)" : ""}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground italic">
                    {b.out ? (
                      <button
                        onClick={() => {
                          const fow = inn.fallOfWickets.find((f) => f.batter === b.name && f.overBall === b.overBall);
                          if (fow) onDismissalSelect(fow);
                        }}
                        className="text-left italic text-primary underline-offset-2 hover:underline"
                      >
                        {dismissalText(b)}
                      </button>
                    ) : dismissalText(b)}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-foreground">{isYetToBat ? "—" : b.runs}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{isYetToBat ? "—" : b.balls}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{isYetToBat ? "—" : b.fours}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{isYetToBat ? "—" : b.sixes}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{isYetToBat ? "—" : sr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ExtrasSummary extras={inn.extras} />
      <FallOfWicketsList wickets={inn.fallOfWickets} onSelect={onDismissalSelect} />
    </div>
  );
}

function ExtrasSummary({ extras }: { extras: ExtrasBreakdown }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-background/30 p-3 text-xs">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Extras — {extrasTotal(extras)}</p>
      <p className="mt-1 text-muted-foreground">
        Wides {extras.wides} · No-balls {extras.noBalls} · Byes {extras.byes} · Leg-byes {extras.legByes} · Penalty {extras.penalty}
      </p>
    </div>
  );
}

function FallOfWicketsList({ wickets, onSelect }: { wickets: FallOfWicket[]; onSelect: (detail: FallOfWicket) => void }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-background/30 p-3 text-xs">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fall of wickets</p>
      {wickets.length === 0 ? (
        <p className="mt-1 text-muted-foreground">No wickets fell.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {wickets.map((w) => (
            <button
              key={`${w.wicket}-${w.batter}-${w.overBall}`}
              onClick={() => onSelect(w)}
              className={`rounded-md border px-2 py-1 text-left ${w.isPlayer ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"}`}
            >
              {w.wicket}-{w.score} ({w.batter}, {w.overBall})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BowlingScorecardTable({
  inn, title, playerName,
}: {
  inn: InningsState;
  title: string;
  playerName: string;
}) {
  // Only show bowlers who actually bowled
  const rows = inn.bowlers.filter((b) => b.balls > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-elegant">
      <h3 className="mb-3 text-display text-base text-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="py-1.5 pr-2">Bowler</th>
              <th className="py-1.5 pr-2 text-right">O</th>
              <th className="py-1.5 pr-2 text-right">M</th>
              <th className="py-1.5 pr-2 text-right">R</th>
              <th className="py-1.5 pr-2 text-right">W</th>
              <th className="py-1.5 text-right">Econ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No bowlers recorded.</td></tr>
            )}
            {rows.map((b) => {
              const overs = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
              const econ = b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "—";
              return (
                <tr
                  key={b.name}
                  className={`border-b border-border/40 ${b.name === playerName ? "bg-primary/10" : ""}`}
                >
                  <td className="py-1.5 pr-2 text-display">
                    {b.name}{b.name === playerName ? " (you)" : ""}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-foreground">{overs}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{b.maidens}</td>
                  <td className="py-1.5 pr-2 text-right text-foreground">{b.runs}</td>
                  <td className="py-1.5 pr-2 text-right text-primary">{b.wickets}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{econ}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
