import { describe, it, expect } from "vitest";
import {
  recordBall,
  emptyState,
  extrasTotal,
  bowlerRunsCharged,
  type ScoreState,
} from "./scorecard";
import type { BallOutcome } from "./types";

// ---------- Ball outcome factories ----------
const C = ""; // commentary placeholder
const dot = (): BallOutcome => ({ runs: 0, isWicket: false, isBoundary: false, isExtra: false, commentary: C });
const single = (): BallOutcome => ({ runs: 1, isWicket: false, isBoundary: false, isExtra: false, commentary: C });
const four = (): BallOutcome => ({ runs: 4, isWicket: false, isBoundary: true, isExtra: false, commentary: C });
const six = (): BallOutcome => ({ runs: 6, isWicket: false, isBoundary: true, isExtra: false, commentary: C });
const wide = (runs = 1): BallOutcome => ({ runs, isWicket: false, isBoundary: false, isExtra: true, extraType: "Wide", commentary: C });
const noBall = (runs = 1): BallOutcome => ({ runs, isWicket: false, isBoundary: false, isExtra: true, extraType: "No Ball", commentary: C });
const bye = (runs = 1): BallOutcome => ({ runs, isWicket: false, isBoundary: false, isExtra: true, extraType: "Bye", commentary: C });
const legBye = (runs = 1): BallOutcome => ({ runs, isWicket: false, isBoundary: false, isExtra: true, extraType: "Leg Bye", commentary: C });
const bowled = (): BallOutcome => ({ runs: 0, isWicket: true, wicketType: "Bowled", isBoundary: false, isExtra: false, commentary: C });
const runOut = (runsCompleted = 0): BallOutcome => ({ runs: runsCompleted, isWicket: true, wicketType: "Run Out", isBoundary: false, isExtra: false, commentary: C });
const runOutOnWide = (runs = 1): BallOutcome => ({ runs, isWicket: true, wicketType: "Run Out", isBoundary: false, isExtra: true, extraType: "Wide", commentary: C });

// Invariant: the team total must always equal the sum of every batter's runs
// plus the extras breakdown. The wickets total must equal batters marked out.
function assertConsistent(s: ScoreState) {
  const battersRuns = s.batters.reduce((sum, b) => sum + b.runs, 0);
  expect(s.runs).toBe(battersRuns + extrasTotal(s.extras));
  expect(s.wickets).toBe(s.batters.filter((b) => b.out).length);
  // bowlers' runs conceded sum must equal team runs minus byes/leg-byes/penalty
  const bowled = s.bowlers.reduce((sum, b) => sum + b.runs, 0);
  const nonBowlerExtras = s.extras.byes + s.extras.legByes + s.extras.penalty;
  expect(bowled).toBe(s.runs - nonBowlerExtras);
}

describe("scorecard — extras and run-out totals stay consistent", () => {
  it("wides are added to extras and bowler runs, not the striker", () => {
    const s = emptyState();
    recordBall(s, wide(1), "Striker", "Bowler");
    recordBall(s, wide(2), "Striker", "Bowler"); // wide + 1 (overthrow)
    expect(s.extras.wides).toBe(3);
    expect(s.runs).toBe(3);
    expect(s.balls).toBe(0); // illegal balls do not count
    const striker = s.batters.find((b) => b.name === "Striker")!;
    expect(striker.runs).toBe(0);
    expect(striker.balls).toBe(0);
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.runs).toBe(3);
    expect(bw.balls).toBe(0);
    assertConsistent(s);
  });

  it("no-balls add to extras + bowler, do not consume a legal ball", () => {
    const s = emptyState();
    recordBall(s, noBall(1), "Striker", "Bowler");
    recordBall(s, noBall(5), "Striker", "Bowler"); // no-ball + boundary
    expect(s.extras.noBalls).toBe(6);
    expect(s.runs).toBe(6);
    expect(s.balls).toBe(0);
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.runs).toBe(6);
    assertConsistent(s);
  });

  it("byes add to extras only, NOT to bowler or striker, but consume a legal ball", () => {
    const s = emptyState();
    recordBall(s, bye(2), "Striker", "Bowler");
    expect(s.extras.byes).toBe(2);
    expect(s.runs).toBe(2);
    expect(s.balls).toBe(1);
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.runs).toBe(0);
    expect(bw.balls).toBe(1);
    const striker = s.batters.find((b) => b.name === "Striker")!;
    expect(striker.runs).toBe(0);
    expect(striker.balls).toBe(0); // byes don't count as faced balls in this model
    assertConsistent(s);
  });

  it("leg-byes add to extras only, like byes", () => {
    const s = emptyState();
    recordBall(s, legBye(4), "Striker", "Bowler");
    expect(s.extras.legByes).toBe(4);
    expect(s.runs).toBe(4);
    expect(s.balls).toBe(1);
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.runs).toBe(0);
    assertConsistent(s);
  });

  it("run-out off a legal ball: completed runs count to striker, wicket not credited to bowler", () => {
    const s = emptyState();
    recordBall(s, single(), "A", "Bowler");
    recordBall(s, runOut(1), "A", "Bowler");
    expect(s.wickets).toBe(1);
    expect(s.runs).toBe(2);
    const a = s.batters.find((b) => b.name === "A")!;
    expect(a.out).toBe(true);
    expect(a.dismissal).toBe("Run Out");
    expect(a.runs).toBe(2);
    expect(a.bowler).toBeUndefined();
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.wickets).toBe(0);
    assertConsistent(s);
  });

  it("run-out off a wide: extra counted, no ball faced, batter still out, bowler not credited", () => {
    const s = emptyState();
    recordBall(s, runOutOnWide(1), "A", "Bowler");
    expect(s.extras.wides).toBe(1);
    expect(s.wickets).toBe(1);
    expect(s.runs).toBe(1);
    expect(s.balls).toBe(0);
    const a = s.batters.find((b) => b.name === "A")!;
    expect(a.runs).toBe(0);
    expect(a.balls).toBe(0);
    expect(a.dismissal).toBe("Run Out");
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.wickets).toBe(0);
    expect(bw.runs).toBe(1); // wide is charged to bowler
    assertConsistent(s);
  });

  it("bowled wicket credits the bowler", () => {
    const s = emptyState();
    recordBall(s, bowled(), "A", "Bowler");
    const bw = s.bowlers.find((b) => b.name === "Bowler")!;
    expect(bw.wickets).toBe(1);
    expect(s.wickets).toBe(1);
    assertConsistent(s);
  });

  it("mixed innings: striker scores, partner scores, extras of every type, run-outs — totals reconcile", () => {
    const s = emptyState();
    const balls: Array<[BallOutcome, string]> = [
      [four(), "A"],
      [single(), "A"],
      [wide(1), "B"],
      [bye(2), "B"],
      [noBall(3), "B"], // no-ball + 2 off the bat scenario simplified
      [legBye(1), "B"],
      [six(), "B"],
      [single(), "B"],
      [runOut(1), "A"],
      [dot(), "B"],
      [runOutOnWide(1), "B"],
      [bowled(), "C"],
    ];
    for (const [o, st] of balls) recordBall(s, o, st, "Bowler");

    // Cross-check team total directly
    const expectedRuns =
      4 + 1 /* A first two */ +
      1 + 2 + 3 + 1 + 6 + 1 /* B's various deliveries */ +
      1 /* run-out completed run for A */ +
      0 + 1 /* dot, run-out on wide */ +
      0; /* bowled */
    expect(s.runs).toBe(expectedRuns);
    expect(s.wickets).toBe(3);
    expect(s.extras.wides).toBe(2);
    expect(s.extras.noBalls).toBe(3);
    expect(s.extras.byes).toBe(2);
    expect(s.extras.legByes).toBe(1);
    assertConsistent(s);
  });
});

describe("bowlerRunsCharged helper", () => {
  it("charges wides + no-balls but not byes/leg-byes", () => {
    expect(bowlerRunsCharged(wide(2))).toBe(2);
    expect(bowlerRunsCharged(noBall(3))).toBe(3);
    expect(bowlerRunsCharged(bye(4))).toBe(0);
    expect(bowlerRunsCharged(legBye(1))).toBe(0);
    expect(bowlerRunsCharged(four())).toBe(4);
  });
});
