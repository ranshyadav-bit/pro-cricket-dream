// Pure scorecard helpers — extracted from match.tsx so they can be unit-tested
// in isolation. The match route imports these to avoid duplicating logic.

import type { BallOutcome } from "./types";

export type DismissalKind = "Bowled" | "LBW" | "Caught" | "Stumped" | "Run Out";

export interface BatterCard {
  name: string;
  isPlayer: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: DismissalKind;
  bowler?: string;
  fielder?: string;
  overBall?: string;
  scoreAtDismissal?: string;
  battedOrder: number;
}

export interface BowlerCard {
  name: string;
  isPlayer: boolean;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  _curOverRuns: number;
  _curOverBalls: number;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface ScoreState {
  runs: number;
  wickets: number;
  balls: number; // legal balls bowled
  batters: BatterCard[];
  bowlers: BowlerCard[];
  extras: ExtrasBreakdown;
}

export const EMPTY_EXTRAS: ExtrasBreakdown = {
  wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0,
};

export function cloneExtras(e?: ExtrasBreakdown): ExtrasBreakdown {
  return { ...EMPTY_EXTRAS, ...(e ?? {}) };
}

export function isLegalBall(o: BallOutcome): boolean {
  return !o.isExtra || o.extraType === "Bye" || o.extraType === "Leg Bye";
}

export function extrasTotal(e: ExtrasBreakdown): number {
  return e.wides + e.noBalls + e.byes + e.legByes + e.penalty;
}

export function bowlerRunsCharged(o: BallOutcome): number {
  if (o.isExtra && (o.extraType === "Wide" || o.extraType === "No Ball")) return o.runs;
  if (o.isExtra) return 0;
  return o.runs;
}

export function addExtras(state: ScoreState, o: BallOutcome): void {
  if (!o.isExtra) return;
  if (o.extraType === "Wide") state.extras.wides += o.runs;
  else if (o.extraType === "No Ball") state.extras.noBalls += o.runs;
  else if (o.extraType === "Bye") state.extras.byes += o.runs;
  else if (o.extraType === "Leg Bye") state.extras.legByes += o.runs;
  else state.extras.penalty += o.runs;
}

export function makeBatter(name: string, isPlayer = false): BatterCard {
  return { name, isPlayer, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, battedOrder: 0 };
}

export function makeBowler(name: string, isPlayer = false): BowlerCard {
  return { name, isPlayer, balls: 0, runs: 0, wickets: 0, maidens: 0, _curOverRuns: 0, _curOverBalls: 0 };
}

export function emptyState(): ScoreState {
  return { runs: 0, wickets: 0, balls: 0, batters: [], bowlers: [], extras: cloneExtras() };
}

/**
 * Apply a single delivery to the scorecard state. Mutates `state` and returns it.
 * Team totals (runs, wickets) are derived from the per-batter cards + extras so
 * the scorecard can never drift from the innings totals.
 */
export function recordBall(
  state: ScoreState,
  o: BallOutcome,
  strikerName: string | null,
  bowlerName: string | null,
): ScoreState {
  const legal = isLegalBall(o);
  addExtras(state, o);

  // Bowler card
  if (bowlerName) {
    let bw = state.bowlers.find((b) => b.name === bowlerName);
    if (!bw) {
      bw = makeBowler(bowlerName);
      state.bowlers.push(bw);
    }
    if (legal) {
      bw.balls += 1;
      bw._curOverBalls += 1;
    }
    const charged = bowlerRunsCharged(o);
    if (charged > 0) {
      bw.runs += charged;
      bw._curOverRuns += charged;
    }
    if (o.isWicket && o.wicketType !== "Run Out") {
      bw.wickets += 1;
    }
    if (bw._curOverBalls >= 6) {
      if (bw._curOverRuns === 0) bw.maidens += 1;
      bw._curOverRuns = 0;
      bw._curOverBalls = 0;
    }
  }

  // Striker card — runs only attributed on a non-extra ball.
  if (strikerName) {
    let bt = state.batters.find((b) => b.name === strikerName);
    if (!bt) {
      bt = makeBatter(strikerName);
      state.batters.push(bt);
    }
    if (!o.isExtra) {
      bt.balls += 1;
      bt.runs += o.runs;
      if (o.runs === 4) bt.fours += 1;
      if (o.runs === 6) bt.sixes += 1;
      if (o.isWicket) {
        bt.out = true;
        bt.dismissal = (o.wicketType ?? "Bowled") as DismissalKind;
        if (bt.dismissal !== "Run Out" && bowlerName) bt.bowler = bowlerName;
      }
    } else if (o.isWicket) {
      // Run-out off an extra delivery (rare). The runs are attributed to extras
      // (wide/no-ball/bye/leg-bye), but the batter is still dismissed.
      bt.out = true;
      bt.dismissal = "Run Out";
    }
  }

  // Update legal-ball count
  if (legal) state.balls += 1;

  // Derive team totals — single source of truth.
  const battersRuns = state.batters.reduce((s, b) => s + b.runs, 0);
  state.runs = battersRuns + extrasTotal(state.extras);
  state.wickets = state.batters.filter((b) => b.out).length;
  return state;
}
