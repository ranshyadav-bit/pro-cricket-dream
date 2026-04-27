// Mid-match save snapshot — lets the player resume a match left in progress.

import type { BallOutcome, ShotType } from "./types";

export type SavedDismissalKind = "Bowled" | "LBW" | "Caught" | "Stumped" | "Run Out";

export interface SavedBatterCard {
  name: string;
  isPlayer: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: SavedDismissalKind;
  bowler?: string;
  fielder?: string;
  overBall?: string;
  scoreAtDismissal?: string;
  battedOrder: number;
}

export interface SavedBowlerCard {
  name: string;
  isPlayer: boolean;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  _curOverRuns: number;
  _curOverBalls: number;
}

export interface SavedExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface InningsSnapshot {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  log: BallOutcome[];
  playerRuns: number;
  playerBalls: number;
  playerFours: number;
  playerSixes: number;
  playerOut: boolean;
  playerWicketsTaken: number;
  playerRunsConceded: number;
  playerBallsBowled: number;
  // Strike rotation
  strikerIsPlayer: boolean;
  partnerName: string;
  partnerRuns: number;
  partnerBalls: number;
  // Batting order position (1..9) for this innings
  battingPosition: number;
  // Day for Test format
  day: number;
  declared?: boolean;
  batters?: SavedBatterCard[];
  bowlers?: SavedBowlerCard[];
  battedCount?: number;
  extras?: SavedExtrasBreakdown;
}

export interface MatchSnapshot {
  fixtureId: string;
  competition: string;
  opponent: string;
  format: "T20" | "ODI" | "Test" | "Club";
  // Toss
  tossWon: boolean;
  tossChoice: "bat" | "bowl";
  battingFirst: boolean;
  // Innings
  innings: InningsSnapshot[]; // 2 for limited overs, up to 4 for Test
  currentInnings: number; // 0-indexed
  target: number | null;
  phase: "intro" | "batting" | "bowling" | "innings-break" | "result";
  lastShot?: ShotType;
  startedAt: number;
}
