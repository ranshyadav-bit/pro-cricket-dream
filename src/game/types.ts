// Core game type definitions for Pro Cricket Career 26

export type Role =
  | "Top-Order Bat"
  | "Middle-Order Bat"
  | "Finisher"
  | "Wicket-Keeper Bat"
  | "All-Rounder"
  | "Pace Bowler"
  | "Swing Bowler"
  | "Off-Spinner"
  | "Leg-Spinner";

export type Nation =
  | "Australia"
  | "England"
  | "India"
  | "Pakistan"
  | "South Africa"
  | "New Zealand"
  | "West Indies"
  | "Sri Lanka"
  | "Bangladesh";

export type Tier = "Club" | "Domestic" | "National A" | "International" | "Franchise T20";

export interface Skills {
  // Batting
  timing: number;
  technique: number;
  power: number;
  patience: number;
  // Bowling
  pace: number;
  accuracy: number;
  movement: number; // swing/spin
  variation: number;
  // Mental + body
  fitness: number;
  composure: number;
}

export interface Player {
  id: string;
  name: string;
  nation: Nation;
  role: Role;
  age: number; // years (can have decimals)
  skills: Skills;
  potential: number; // hidden cap 65–95
  fitness: number; // 0-100, depletes with matches/training
  confidence: number; // 0-100
  morale: number; // 0-100
  cash: number; // career earnings (in $k)
  tier: Tier;
  team: string; // current club / franchise
  perks: string[];
  retired: boolean;
}

export interface CareerStats {
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  notOuts: number;
  highestScore: number;
  oversBowled: number; // store as decimal (e.g. 4.3 = 4 overs 3 balls)
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  fiveFors: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  catches: number;
  manOfMatch: number;
}

export interface Fixture {
  id: string;
  week: number; // 1-52
  year: number;
  competition: string;
  opponent: string;
  format: "T20" | "ODI" | "Test" | "Club";
  venue: "Home" | "Away" | "Neutral";
  played: boolean;
}

export interface InboxMessage {
  id: string;
  week: number;
  year: number;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  type: "scout" | "coach" | "contract" | "milestone" | "press" | "system";
  // Optional structured offer payload for contract messages
  offer?: {
    id: string;
    fromTeam: string;
    league?: "IPL" | "BBL" | "PSL" | "County";
    format: "T20" | "ODI" | "Test" | "Multi";
    tier: Tier;
    basePrice: number;
    signingBonus: number;
    durationYears: number;
    accepted?: boolean;
    declined?: boolean;
  };
}

export interface SaveGame {
  version: 1;
  player: Player;
  stats: CareerStats;
  weekStats: CareerStats; // running this-season totals
  seasonStats: CareerStats;
  fixtures: Fixture[];
  inbox: InboxMessage[];
  week: number; // 1-52
  year: number; // in-game year, starts 2026
  createdAt: number;
  lastPlayedAt: number;
  // Bowling — store “best figures” from career
  notesUnlocked: string[];
  // Parallel league sim (IPL/BBL/PSL/County). Created lazily on first read.
  leagues?: import("./leagues").LeaguesState;
  // Tracks years we've already produced contract offers for (avoid duplicates)
  offerYears?: number[];
  // Active contract value (in $k) — bumped when offers accepted
  contractValue?: number;
  // Contract slots: 1 franchise + 1 nation max
  contractSlots?: ContractSlots;
  // ICC tournament state (T20 WC, ODI WC, WTC)
  tournaments?: import("./tournaments").TournamentsState;
  // Mid-match resume snapshot (one match at a time)
  matchInProgress?: import("./matchSave").MatchSnapshot | null;
}

export interface ContractSlots {
  franchise: { team: string; league: "IPL" | "BBL" | "PSL" | "County"; expiresYear: number } | null;
  nation: { team: string; expiresYear: number } | null;
}

// Match-screen types
export type ShotType =
  | "Leave"
  | "Defend"
  | "Block"
  | "Push for 1"
  | "Drive"
  | "Cut"
  | "Pull"
  | "Sweep"
  | "Loft"
  | "Slog";

export type DeliveryType =
  | "Stock"
  | "Yorker"
  | "Bouncer"
  | "Slower"
  | "Outswinger"
  | "Inswinger"
  | "Off-Break"
  | "Leg-Break"
  | "Doosra";

export type LinePos = "Wide" | "Off" | "Stump" | "Leg";
export type LengthPos = "Yorker" | "Full" | "Good" | "Short";

export interface BallOutcome {
  runs: number;
  isWicket: boolean;
  wicketType?: "Bowled" | "LBW" | "Caught" | "Stumped" | "Run Out";
  isBoundary: boolean;
  isExtra: boolean;
  extraType?: "Wide" | "No Ball" | "Bye" | "Leg Bye";
  commentary: string;
  shot?: ShotType;
  delivery?: DeliveryType;
}

export interface MatchInningsState {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  ballsBowled: number; // legitimate balls
  legalBallsThisOver: number;
  overLimit: number; // number of overs in innings (T20=20, ODI=50, etc.)
  target: number | null; // for chases
  // Player-specific in this innings
  playerRuns: number;
  playerBalls: number;
  playerFours: number;
  playerSixes: number;
  playerOut: boolean;
  playerWicketsTaken: number;
  playerRunsConceded: number;
  playerBallsBowled: number;
  // History for commentary feed
  log: BallOutcome[];
}

export interface MatchSetup {
  fixtureId: string;
  competition: string;
  opponent: string;
  format: "T20" | "ODI" | "Test" | "Club";
  overs: number; // overs per side
  // Whether the player bats this match (we simplify: pick role)
  playerBats: boolean;
  playerBowls: boolean;
}
