import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { battingRating, bowlingRating } from "@/game/rating";
import { generateClubSquad, getNationSquad, getOppositionSquad } from "@/game/rosters";
import type { RosterPlayer } from "@/game/rosters";
import type {
  BallOutcome,
  DeliveryType,
  Fixture,
  LengthPos,
  LinePos,
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

type Phase = "intro" | "batting" | "bowling" | "innings-break" | "result";

interface InningsState {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number; // legal balls bowled
  log: BallOutcome[];
  // player-specific
  playerRuns: number;
  playerBalls: number;
  playerFours: number;
  playerSixes: number;
  playerOut: boolean;
  playerWicketsTaken: number;
  playerRunsConceded: number;
  playerBallsBowled: number;
}

function emptyInnings(batting: string, bowling: string): InningsState {
  return {
    battingTeam: batting, bowlingTeam: bowling,
    runs: 0, wickets: 0, balls: 0, log: [],
    playerRuns: 0, playerBalls: 0, playerFours: 0, playerSixes: 0, playerOut: false,
    playerWicketsTaken: 0, playerRunsConceded: 0, playerBallsBowled: 0,
  };
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

  const totalOvers = oversForFormat(fixture.format);
  // Player gets a fixed allocation of overs to bowl + a chance to bat
  const playerBowlsOvers = isBowler || isAR ? Math.min(4, Math.floor(totalOvers / 5)) : 0;

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
    // Try matching league squad
    const real = getOppositionSquad({ competition: fixture.competition, opponent: myTeam, format: fixture.format, nation: save.player.nation });
    if (real) {
      return [{ name: save.player.name, role: save.player.role, rating: 75 }, ...real.filter((p) => p.name !== save.player.name).slice(0, 10)];
    }
    return [{ name: save.player.name, role: save.player.role, rating: 75 }, ...generateClubSquad(save.player.nation, myTeam, 10)];
  }, [save.player, myTeam, fixture.competition, fixture.format]);

  const [phase, setPhase] = useState<Phase>("intro");
  // We're either: bat 1st then bowl OR bowl 1st then bat
  const [tossWon] = useState(() => Math.random() < 0.5);
  const [chose] = useState<"bat" | "bowl">(() => (Math.random() < 0.5 ? "bat" : "bowl"));
  const battingFirst = tossWon ? chose === "bat" : chose === "bowl";

  // Innings state
  const [inn1, setInn1] = useState<InningsState>(() =>
    battingFirst ? emptyInnings(myTeam, opp) : emptyInnings(opp, myTeam),
  );
  const [inn2, setInn2] = useState<InningsState>(() =>
    battingFirst ? emptyInnings(opp, myTeam) : emptyInnings(myTeam, opp),
  );
  const [currentInn, setCurrentInn] = useState<1 | 2>(1);
  const [target, setTarget] = useState<number | null>(null);

  const isMyBatting = (currentInn === 1 ? inn1 : inn2).battingTeam === myTeam;

  // For bowling phase — current AI batter rating drifts down/up randomly per wicket
  const [aiBatterRating, setAiBatterRating] = useState(() => 50 + Math.floor(Math.random() * 25));
  const [aiBatterIdx, setAiBatterIdx] = useState(1);

  const [bowlingChoice, setBowlingChoice] = useState<{ delivery: DeliveryType; line: LinePos; length: LengthPos } | null>(null);
  const isPaceRole = ["Pace Bowler", "Swing Bowler"].includes(player.role) || isAR;
  const deliveryOptions = isPaceRole ? DELIVERIES_BY_TYPE.pace : DELIVERIES_BY_TYPE.spin;

  // Auto-resolve the partner's overs etc. (we sim non-player overs in bulk)
  const inn = currentInn === 1 ? inn1 : inn2;
  const setInn = currentInn === 1 ? setInn1 : setInn2;

  const oversBowled = Math.floor(inn.balls / 6);
  const ballThisOver = inn.balls % 6;

  // Decide what the user does in current innings
  function startInnings() {
    if (isMyBatting) {
      setPhase("batting");
    } else {
      setPhase("bowling");
      setBowlingChoice({ delivery: "Stock", line: "Stump", length: "Good" });
    }
  }

  // ---------- Batting flow ----------
  function takeShot(shot: ShotType) {
    const ai = aiBowlerDelivery(60, fixture.format, ballThisOver);
    const oversLeft = totalOvers - oversBowled - (ballThisOver ? 1 : 0);
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
    applyBattingOutcome(outcome);
  }

  function applyBattingOutcome(o: BallOutcome) {
    setInn((cur) => {
      const next: InningsState = { ...cur, log: [o, ...cur.log].slice(0, 25) };
      next.runs += o.runs;
      if (!o.isExtra) next.balls += 1;
      // Player batting stats (assume player is on strike most of the time)
      if (!o.isExtra) {
        next.playerBalls += 1;
        next.playerRuns += o.runs;
        if (o.runs === 4) next.playerFours += 1;
        if (o.runs === 6) next.playerSixes += 1;
        if (o.isWicket) {
          next.wickets += 1;
          next.playerOut = true;
        }
      } else if (o.extraType === "Wide") {
        // Wide: doesn't count as ball, runs already added
      }
      return next;
    });
  }

  // Auto-finish player's batting innings: once player is out, fast-forward partners
  useEffect(() => {
    if (phase !== "batting") return;
    if (!inn.playerOut) return;
    // Sim remaining overs quickly
    const interval = setInterval(() => {
      setInn((cur) => {
        if (cur.balls >= totalOvers * 6 || cur.wickets >= 10) return cur;
        // Simple sim: 1 ball at a time with random outcome
        const r = Math.random();
        let runs = 0;
        let isWicket = false;
        if (r < 0.05) isWicket = true;
        else if (r < 0.5) runs = 0;
        else if (r < 0.75) runs = 1;
        else if (r < 0.85) runs = 2;
        else if (r < 0.95) runs = 4;
        else runs = 6;
        const o: BallOutcome = {
          runs, isWicket, isBoundary: runs === 4 || runs === 6, isExtra: false,
          commentary: isWicket ? `Wicket falls — partner gone.` : runs === 0 ? `Dot.` : runs >= 4 ? `Boundary by partner!` : `${runs} taken.`,
        };
        const next = { ...cur, log: [o, ...cur.log].slice(0, 25), runs: cur.runs + runs, balls: cur.balls + 1 };
        if (isWicket) next.wickets += 1;
        return next;
      });
    }, 220);
    return () => clearInterval(interval);
  }, [phase, inn.playerOut, totalOvers, setInn]);

  // ---------- Bowling flow ----------
  function bowlBall() {
    if (!bowlingChoice) return;
    if (inn.playerBallsBowled >= playerBowlsOvers * 6) return; // out of overs
    const oversLeft = totalOvers - oversBowled - (ballThisOver ? 1 : 0);
    const pressure = target ? Math.min(1, Math.max(0, (target - inn.runs) / Math.max(1, oversLeft * 6))) : 0.2;
    const outcome = resolveBowling({
      player,
      delivery: bowlingChoice.delivery,
      line: bowlingChoice.line,
      length: bowlingChoice.length,
      batterRating: aiBatterRating,
      pressure,
    });
    setInn((cur) => {
      const next = { ...cur, log: [outcome, ...cur.log].slice(0, 25) };
      next.runs += outcome.runs;
      if (!outcome.isExtra) {
        next.balls += 1;
        next.playerBallsBowled += 1;
      }
      next.playerRunsConceded += outcome.runs;
      if (outcome.isWicket) {
        next.wickets += 1;
        next.playerWicketsTaken += 1;
      }
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
    if (phase !== "bowling") return;
    if (simInProgress.current) return;
    // Player's bowling quota done OR innings limits reached → finish opp innings
    const playerDone = inn.playerBallsBowled >= playerBowlsOvers * 6;
    const inningsDone = inn.balls >= totalOvers * 6 || inn.wickets >= 10;
    if (inningsDone) return;
    if (!playerDone) return;
    simInProgress.current = true;
    const interval = setInterval(() => {
      setInn((cur) => {
        if (cur.balls >= totalOvers * 6 || cur.wickets >= 10) return cur;
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
        const next = { ...cur, log: [o, ...cur.log].slice(0, 25), runs: cur.runs + runs, balls: cur.balls + 1 };
        if (isWicket) next.wickets += 1;
        return next;
      });
    }, 200);
    return () => { clearInterval(interval); simInProgress.current = false; };
  }, [phase, inn.playerBallsBowled, inn.balls, inn.wickets, totalOvers, playerBowlsOvers, setInn]);

  // Detect innings completion → next phase
  useEffect(() => {
    if (phase !== "batting" && phase !== "bowling") return;
    const inningsDone = inn.balls >= totalOvers * 6 || inn.wickets >= 10;
    // Also for batting: if 2nd innings chase and runs >= target → done
    const targetReached = currentInn === 2 && target !== null && inn.runs >= target;
    // For player batting after out, we let the auto-sim finish; same for bowling
    if (inningsDone || targetReached) {
      if (currentInn === 1) {
        setPhase("innings-break");
      } else {
        setPhase("result");
      }
    }
  }, [phase, inn.balls, inn.wickets, inn.runs, currentInn, target, totalOvers]);

  function startSecondInnings() {
    setTarget(inn1.runs + 1);
    setCurrentInn(2);
    if ((battingFirst ? inn2 : inn2).battingTeam === myTeam) {
      setPhase("batting");
    } else {
      setPhase("bowling");
      setBowlingChoice({ delivery: "Stock", line: "Stump", length: "Good" });
    }
  }

  // Save match results when phase becomes "result"
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== "result") return;
    if (savedRef.current) return;
    savedRef.current = true;
    const myInn = inn1.battingTeam === myTeam ? inn1 : inn2;
    const oppInn = inn1.battingTeam === myTeam ? inn2 : inn1;
    const myBowlInn = inn1.bowlingTeam === myTeam ? inn1 : inn2;
    const won = myInn.runs > oppInn.runs;
    const tied = myInn.runs === oppInn.runs;
    const matchSummary = {
      runs: myInn.playerRuns,
      balls: myInn.playerBalls,
      fours: myInn.playerFours,
      sixes: myInn.playerSixes,
      out: myInn.playerOut,
      wickets: myBowlInn.playerWicketsTaken,
      runsConceded: myBowlInn.playerRunsConceded,
      ballsBowled: myBowlInn.playerBallsBowled,
      catches: 0,
      manOfMatch: (myInn.playerRuns >= 50 || myBowlInn.playerWicketsTaken >= 3) && Math.random() < 0.5,
      played: true,
    };
    const newStats = mergeMatchStats(save.stats, matchSummary);
    const newSeasonStats = mergeMatchStats(save.seasonStats, matchSummary);
    // Confidence drift
    let conf = save.player.confidence;
    let mor = save.player.morale;
    if (matchSummary.runs >= 50 || matchSummary.wickets >= 3) { conf = Math.min(100, conf + 10); mor = Math.min(100, mor + 5); }
    else if (matchSummary.runs <= 5 && matchSummary.wickets === 0) { conf = Math.max(0, conf - 8); mor = Math.max(0, mor - 3); }
    if (won) mor = Math.min(100, mor + 4);
    if (tied) {/* no-op */}
    if (!won && !tied) mor = Math.max(0, mor - 2);
    const newSave: SaveGame = {
      ...save,
      stats: newStats,
      seasonStats: newSeasonStats,
      player: { ...save.player, confidence: conf, morale: mor, fitness: Math.max(20, save.player.fitness - 6) },
      fixtures: save.fixtures.map((f) => f.id === fixture.id ? { ...f, played: true } : f),
      inbox: [
        {
          id: Math.random().toString(36).slice(2, 10),
          week: fixture.week, year: fixture.year,
          from: fixture.competition,
          subject: `${won ? "WON" : tied ? "TIED" : "LOST"} vs ${fixture.opponent}`,
          body: `Final: ${myInn.runs}/${myInn.wickets} (${(myInn.balls/6).toFixed(1)} ov) vs ${oppInn.runs}/${oppInn.wickets} (${(oppInn.balls/6).toFixed(1)} ov). You: ${matchSummary.runs}${matchSummary.out ? "" : "*"} (${matchSummary.balls})${matchSummary.ballsBowled > 0 ? ` · ${matchSummary.wickets}/${matchSummary.runsConceded}` : ""}.${matchSummary.manOfMatch ? " Player of the Match!" : ""}`,
          read: false,
          type: (matchSummary.manOfMatch ? "milestone" : "system") as "milestone" | "system",
        },
        ...save.inbox,
      ].slice(0, 50),
    };
    writeSave(newSave);
    setSave(newSave);
  }, [phase, inn1, inn2, save, fixture, myTeam, setSave]);

  // ---------- Render ----------
  const myInn = inn1.battingTeam === myTeam ? inn1 : inn2;
  const oppInn = inn1.battingTeam === myTeam ? inn2 : inn1;
  const myBowlInn = inn1.bowlingTeam === myTeam ? inn1 : inn2;

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-display text-xs text-primary">{fixture.competition} · {fixture.format}</p>
          <h1 className="text-display text-2xl">{myTeam} vs {opp}</h1>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {fixture.venue} · W{fixture.week}·{fixture.year}
        </div>
      </div>

      {phase === "intro" && (
        <GamePanel title="Toss">
          <p>You {tossWon ? "won" : "lost"} the toss. {tossWon ? "You" : opp} chose to {chose}.</p>
          <p className="mt-2">{battingFirst ? `${myTeam} bat first.` : `${opp} bat first. You'll ${isBowler || isAR ? "bowl" : "field"} first.`}</p>
          <button
            onClick={startInnings}
            className="mt-4 rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
          >
            Start Innings 1 →
          </button>
        </GamePanel>
      )}

      {(phase === "batting" || phase === "bowling" || phase === "innings-break") && (
        <>
          {/* Scoreboard */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Scoreboard
              title={`${currentInn === 1 ? "Innings 1" : "Innings 2"} — ${inn.battingTeam}`}
              runs={inn.runs}
              wickets={inn.wickets}
              balls={inn.balls}
              totalOvers={totalOvers}
              target={currentInn === 2 ? target : null}
            />
            {currentInn === 2 && (
              <Scoreboard
                title={`Innings 1 — ${inn1.battingTeam}`}
                runs={inn1.runs}
                wickets={inn1.wickets}
                balls={inn1.balls}
                totalOvers={totalOvers}
                muted
              />
            )}
            {currentInn === 1 && isMyBatting && (
              <PlayerCard
                name={player.name}
                runs={inn.playerRuns}
                balls={inn.playerBalls}
                fours={inn.playerFours}
                sixes={inn.playerSixes}
                out={inn.playerOut}
              />
            )}
            {currentInn === 1 && !isMyBatting && (
              <BowlerCard
                name={player.name}
                wickets={inn.playerWicketsTaken}
                runs={inn.playerRunsConceded}
                balls={inn.playerBallsBowled}
                quota={playerBowlsOvers * 6}
              />
            )}
          </div>

          {phase === "batting" && (
            <BattingPanel
              shotsDisabled={inn.playerOut || inn.balls >= totalOvers * 6 || inn.wickets >= 10 || (currentInn === 2 && target !== null && inn.runs >= target)}
              shotsLocked={inn.playerOut}
              onShot={takeShot}
            />
          )}

          {phase === "bowling" && (
            <BowlingPanel
              choice={bowlingChoice}
              setChoice={setBowlingChoice}
              deliveryOptions={deliveryOptions}
              canBowl={inn.playerBallsBowled < playerBowlsOvers * 6 && inn.balls < totalOvers * 6 && inn.wickets < 10}
              quota={playerBowlsOvers}
              ballsBowled={inn.playerBallsBowled}
              aiBatter={aiBatterIdx}
              onBowl={bowlBall}
            />
          )}

          {phase === "innings-break" && (
            <GamePanel title="Innings Break">
              <p>End of innings 1. {inn1.battingTeam} posted {inn1.runs}/{inn1.wickets} in {(inn1.balls/6).toFixed(1)} overs.</p>
              <p className="mt-1">Target: {inn1.runs + 1}.</p>
              <button
                onClick={startSecondInnings}
                className="mt-4 rounded-md bg-gradient-primary px-6 py-2 text-display text-sm text-primary-foreground shadow-glow"
              >
                Start Innings 2 →
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
            myInn={myInn} oppInn={oppInn} myBowlInn={myBowlInn}
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

function PlayerCard({ name, runs, balls, fours, sixes, out }: {
  name: string; runs: number; balls: number; fours: number; sixes: number; out: boolean;
}) {
  const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You — Batting</p>
      <p className="mt-1 text-display text-2xl text-foreground">{runs}{!out ? "*" : ""} <span className="text-sm text-muted-foreground">({balls})</span></p>
      <p className="mt-1 text-xs text-muted-foreground">SR {sr} · {fours}×4 · {sixes}×6</p>
      {out && <p className="mt-1 text-xs text-destructive">OUT — partner now batting (auto)</p>}
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
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You — Bowling</p>
      <p className="mt-1 text-display text-2xl text-foreground">{wickets}/{runs}</p>
      <p className="mt-1 text-xs text-muted-foreground">{overs} ov · Econ {econ} · Quota {quota / 6} ov</p>
    </div>
  );
}

function BattingPanel({ onShot, shotsDisabled, shotsLocked }: {
  onShot: (s: ShotType) => void; shotsDisabled: boolean; shotsLocked: boolean;
}) {
  return (
    <GamePanel title="Choose Your Shot" subtitle={shotsLocked ? "You're out — partner finishing the innings" : "The bowler is at the top of his run-up..."}>
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
        Aggressive shots (red) score more but risk wickets. Match the shot to the length you expect.
      </p>
    </GamePanel>
  );
}

function isAggressive(s: ShotType): boolean { return ["Loft", "Slog", "Pull"].includes(s); }
function isDefensive(s: ShotType): boolean { return ["Leave", "Defend", "Block"].includes(s); }

function BowlingPanel({ choice, setChoice, deliveryOptions, canBowl, onBowl, quota, ballsBowled, aiBatter }: {
  choice: { delivery: DeliveryType; line: LinePos; length: LengthPos } | null;
  setChoice: (c: { delivery: DeliveryType; line: LinePos; length: LengthPos }) => void;
  deliveryOptions: DeliveryType[];
  canBowl: boolean;
  onBowl: () => void;
  quota: number;
  ballsBowled: number;
  aiBatter: number;
}) {
  if (!choice) return null;
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

function ResultBlock({ myTeam, opp, myInn, oppInn, myBowlInn, playerName }: {
  myTeam: string; opp: string;
  myInn: InningsState; oppInn: InningsState; myBowlInn: InningsState;
  playerName: string;
}) {
  const won = myInn.runs > oppInn.runs;
  const tied = myInn.runs === oppInn.runs;
  return (
    <div>
      <p className={`text-display text-2xl ${won ? "text-primary" : tied ? "text-secondary" : "text-destructive"}`}>
        {won ? `${myTeam} won!` : tied ? "Match Tied" : `${opp} won`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-background/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{myTeam}</p>
          <p className="text-display text-xl">{myInn.runs}/{myInn.wickets}</p>
          <p className="text-xs text-muted-foreground">({(myInn.balls/6).toFixed(1)} ov)</p>
        </div>
        <div className="rounded-md border border-border bg-background/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{opp}</p>
          <p className="text-display text-xl">{oppInn.runs}/{oppInn.wickets}</p>
          <p className="text-xs text-muted-foreground">({(oppInn.balls/6).toFixed(1)} ov)</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="Your Runs" value={myInn.playerRuns} accent />
        <StatBox label="Balls" value={myInn.playerBalls} />
        <StatBox label="4s/6s" value={`${myInn.playerFours}/${myInn.playerSixes}`} />
        <StatBox label="Out" value={myInn.playerOut ? "Yes" : "Not Out"} />
        <StatBox label="Wickets" value={myBowlInn.playerWicketsTaken} accent />
        <StatBox label="Conceded" value={myBowlInn.playerRunsConceded} />
        <StatBox label="Overs" value={`${Math.floor(myBowlInn.playerBallsBowled/6)}.${myBowlInn.playerBallsBowled%6}`} />
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
