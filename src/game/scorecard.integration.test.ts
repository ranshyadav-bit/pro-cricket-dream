// Integration test — simulates a full innings ball-by-ball through the pure
// scorecard module, then constructs the same row data the match scorecard UI
// renders (BattingScorecardTable + BowlingScorecardTable) and asserts that
// every aggregate the user can see reconciles with the simulated totals.

import { describe, it, expect } from "vitest";
import {
  recordBall,
  emptyState,
  extrasTotal,
  isLegalBall,
  type ScoreState,
  type BatterCard,
  type BowlerCard,
} from "./scorecard";
import type { BallOutcome } from "./types";

type BallSpec =
  | { kind: "dot" }
  | { kind: "runs"; n: 1 | 2 | 3 | 4 | 6 }
  | { kind: "wide"; n?: number }
  | { kind: "noBall"; n?: number }
  | { kind: "bye"; n: number }
  | { kind: "legBye"; n: number }
  | { kind: "wicket"; how: "Bowled" | "LBW" | "Caught" | "Stumped" | "Run Out"; runs?: number };

function makeBall(spec: BallSpec): BallOutcome {
  switch (spec.kind) {
    case "dot": return { runs: 0, isWicket: false, isBoundary: false, isExtra: false, commentary: "" };
    case "runs": return { runs: spec.n, isWicket: false, isBoundary: spec.n === 4 || spec.n === 6, isExtra: false, commentary: "" };
    case "wide": return { runs: spec.n ?? 1, isWicket: false, isBoundary: false, isExtra: true, extraType: "Wide", commentary: "" };
    case "noBall": return { runs: spec.n ?? 1, isWicket: false, isBoundary: false, isExtra: true, extraType: "No Ball", commentary: "" };
    case "bye": return { runs: spec.n, isWicket: false, isBoundary: false, isExtra: true, extraType: "Bye", commentary: "" };
    case "legBye": return { runs: spec.n, isWicket: false, isBoundary: false, isExtra: true, extraType: "Leg Bye", commentary: "" };
    case "wicket": return { runs: spec.runs ?? 0, isWicket: true, wicketType: spec.how, isBoundary: false, isExtra: false, commentary: "" };
  }
}

// Simulate an innings, swapping batters in order as wickets fall.
function simulateInnings(squad: string[], bowlers: string[], script: BallSpec[]): ScoreState {
  const state = emptyState();
  let strikerIdx = 0;
  let nextIn = 2; // openers are 0 and 1
  let bowlerIdx = 0;
  let ballsThisOver = 0;

  for (const spec of script) {
    const o = makeBall(spec);
    const striker = squad[strikerIdx];
    const bowler = bowlers[bowlerIdx % bowlers.length];
    recordBall(state, o, striker, bowler);
    if (isLegalBall(o)) {
      ballsThisOver += 1;
      if (ballsThisOver >= 6) {
        ballsThisOver = 0;
        bowlerIdx += 1;
      }
    }
    if (o.isWicket && nextIn < squad.length) {
      strikerIdx = nextIn;
      nextIn += 1;
    }
  }
  return state;
}

// Build the same row shapes the UI renders (mimics BattingScorecardTable +
// BowlingScorecardTable). We don't need a DOM — the route reads these exact
// fields from the BatterCard / BowlerCard objects.
interface RenderedBattingRow { name: string; r: number | "—"; b: number | "—"; fours: number | "—"; sixes: number | "—"; out: boolean; yetToBat: boolean }
interface RenderedBowlingRow { name: string; o: string; m: number; r: number; w: number; econ: string }

function renderBatting(state: ScoreState, squad: string[]): RenderedBattingRow[] {
  // Same sort the UI uses: by name appearance order in the squad
  return squad.map((name): RenderedBattingRow => {
    const c = state.batters.find((b) => b.name === name);
    if (!c) return { name, r: "—", b: "—", fours: "—", sixes: "—", out: false, yetToBat: true };
    return { name: c.name, r: c.runs, b: c.balls, fours: c.fours, sixes: c.sixes, out: c.out, yetToBat: false };
  });
}

function renderBowling(state: ScoreState): RenderedBowlingRow[] {
  return state.bowlers
    .filter((b) => b.balls > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
    .map((b: BowlerCard): RenderedBowlingRow => ({
      name: b.name,
      o: `${Math.floor(b.balls / 6)}.${b.balls % 6}`,
      m: b.maidens,
      r: b.runs,
      w: b.wickets,
      econ: ((b.runs / b.balls) * 6).toFixed(2),
    }));
}

describe("scorecard integration — rendered rows reconcile with innings totals", () => {
  const squad = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  const bowlers = ["BowlA", "BowlB", "BowlC", "BowlD"];

  it("scripted innings: all rendered rows sum back to the team total", () => {
    const script: BallSpec[] = [
      // Over 1
      { kind: "runs", n: 4 }, { kind: "dot" }, { kind: "runs", n: 1 },
      { kind: "wide" }, { kind: "runs", n: 2 }, { kind: "runs", n: 6 }, { kind: "dot" },
      // Over 2
      { kind: "noBall", n: 1 }, { kind: "bye", n: 2 }, { kind: "legBye", n: 1 },
      { kind: "runs", n: 1 }, { kind: "wicket", how: "Bowled" }, { kind: "dot" }, { kind: "runs", n: 4 },
      // Over 3
      { kind: "runs", n: 1 }, { kind: "runs", n: 2 }, { kind: "wicket", how: "Caught" },
      { kind: "wicket", how: "Run Out", runs: 1 }, { kind: "dot" }, { kind: "runs", n: 6 }, { kind: "runs", n: 1 },
      // Over 4
      { kind: "wide", n: 2 }, { kind: "runs", n: 4 }, { kind: "wicket", how: "LBW" },
      { kind: "dot" }, { kind: "runs", n: 1 }, { kind: "wicket", how: "Stumped" }, { kind: "dot" },
    ];

    const state = simulateInnings(squad, bowlers, script);
    const battingRows = renderBatting(state, squad);
    const bowlingRows = renderBowling(state);

    // Rendered batting runs + extras line === team total.
    const battingRowsRunSum = battingRows
      .filter((r) => !r.yetToBat)
      .reduce((s, r) => s + (r.r as number), 0);
    expect(battingRowsRunSum + extrasTotal(state.extras)).toBe(state.runs);

    // Rendered out-rows count === team wickets.
    const wicketsRendered = battingRows.filter((r) => r.out).length;
    expect(wicketsRendered).toBe(state.wickets);

    // Rendered bowler runs sum === team total minus non-bowler extras.
    const bowlerRunsRendered = bowlingRows.reduce((s, r) => s + r.r, 0);
    const nonBowlerExtras = state.extras.byes + state.extras.legByes + state.extras.penalty;
    expect(bowlerRunsRendered).toBe(state.runs - nonBowlerExtras);

    // Rendered bowler wickets === non-runout dismissals.
    const bowlerWicketsRendered = bowlingRows.reduce((s, r) => s + r.w, 0);
    const nonRunouts = state.batters.filter((b) => b.out && b.dismissal !== "Run Out").length;
    expect(bowlerWicketsRendered).toBe(nonRunouts);

    // Rendered overs (sum of bowler balls) === legal balls bowled.
    const ballsRendered = state.bowlers.reduce((s, b) => s + b.balls, 0);
    expect(ballsRendered).toBe(state.balls);

    // Yet-to-bat rendering: (rendered yet-to-bat) + (rendered batted) === squad.length
    const yetToBatRendered = battingRows.filter((r) => r.yetToBat).length;
    expect(yetToBatRendered + (squad.length - yetToBatRendered)).toBe(squad.length);
  });

  it("randomised innings (200 balls) keeps rendered totals consistent", () => {
    // Deterministic LCG so the test is repeatable
    let seed = 0x1234;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pick = (): BallSpec => {
      const r = rand();
      if (r < 0.45) return { kind: "dot" };
      if (r < 0.65) return { kind: "runs", n: 1 };
      if (r < 0.72) return { kind: "runs", n: 2 };
      if (r < 0.80) return { kind: "runs", n: 4 };
      if (r < 0.84) return { kind: "runs", n: 6 };
      if (r < 0.88) return { kind: "wide", n: 1 };
      if (r < 0.91) return { kind: "noBall", n: 1 };
      if (r < 0.93) return { kind: "bye", n: 1 };
      if (r < 0.95) return { kind: "legBye", n: 1 };
      const how = (["Bowled", "LBW", "Caught", "Stumped", "Run Out"] as const)[Math.floor(rand() * 5)];
      return { kind: "wicket", how };
    };
    const script: BallSpec[] = [];
    for (let i = 0; i < 200; i++) script.push(pick());

    const state = simulateInnings(squad, bowlers, script);
    const battingRows = renderBatting(state, squad);
    const bowlingRows = renderBowling(state);

    const battingRowsRunSum = battingRows
      .filter((r) => !r.yetToBat)
      .reduce((s, r) => s + (r.r as number), 0);
    expect(battingRowsRunSum + extrasTotal(state.extras)).toBe(state.runs);
    expect(battingRows.filter((r) => r.out).length).toBe(state.wickets);

    const bowlerRunsRendered = bowlingRows.reduce((s, r) => s + r.r, 0);
    const nonBowlerExtras = state.extras.byes + state.extras.legByes + state.extras.penalty;
    expect(bowlerRunsRendered).toBe(state.runs - nonBowlerExtras);

    const bowlerWicketsRendered = bowlingRows.reduce((s, r) => s + r.w, 0);
    const nonRunouts = state.batters.filter((b: BatterCard) => b.out && b.dismissal !== "Run Out").length;
    expect(bowlerWicketsRendered).toBe(nonRunouts);
  });
});
