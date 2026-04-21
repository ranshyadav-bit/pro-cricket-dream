import type {
  CareerStats,
  Fixture,
  InboxMessage,
  Nation,
  Player,
  Role,
  SaveGame,
  Skills,
} from "./types";
import { createLeaguesState } from "./leagues";

const NATION_CLUBS: Record<Nation, string[]> = {
  Australia: ["Sydney Strikers CC", "Melbourne Suburban CC", "Perth Coastal CC"],
  England: ["Surrey Premier CC", "Yorkshire Village CC", "Middlesex Town CC"],
  India: ["Mumbai Maidan CC", "Bangalore United CC", "Delhi Gymkhana CC"],
  Pakistan: ["Lahore Gymkhana", "Karachi Whites CC", "Rawalpindi Express CC"],
  "South Africa": ["Cape Town CC", "Joburg Highveld CC", "Durban Coastal CC"],
  "New Zealand": ["Auckland CC", "Wellington Harbour CC", "Christchurch CC"],
  "West Indies": ["Bridgetown CC", "Kingston Hill CC", "Port of Spain CC"],
  "Sri Lanka": ["Colombo CC", "Kandy Hill CC", "Galle Fort CC"],
  Bangladesh: ["Dhaka Gymkhana", "Chittagong CC", "Sylhet CC"],
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function id(): string {
  return Math.random().toString(36).slice(2, 10);
}

function startingSkills(role: Role): Skills {
  // Base around 50, biased by role
  const base = (): number => rand(45, 58);
  const lo = (): number => rand(35, 48);
  const s: Skills = {
    timing: base(),
    technique: base(),
    power: base(),
    patience: base(),
    pace: base(),
    accuracy: base(),
    movement: base(),
    variation: base(),
    fitness: rand(60, 75),
    composure: rand(45, 60),
  };
  switch (role) {
    case "Top-Order Bat":
      s.timing += 8; s.technique += 8; s.patience += 6; s.pace = lo(); s.movement = lo(); s.variation = lo();
      break;
    case "Middle-Order Bat":
      s.timing += 6; s.technique += 4; s.power += 4; s.pace = lo(); s.movement = lo(); s.variation = lo();
      break;
    case "Finisher":
      s.power += 12; s.timing += 4; s.composure += 6; s.pace = lo(); s.movement = lo();
      break;
    case "Wicket-Keeper Bat":
      s.timing += 6; s.technique += 4; s.composure += 4; s.pace = lo(); s.movement = lo(); s.variation = lo();
      break;
    case "All-Rounder":
      s.timing += 4; s.power += 2; s.pace += 4; s.accuracy += 4; s.movement += 2;
      break;
    case "Pace Bowler":
      s.pace += 12; s.accuracy += 6; s.movement += 4; s.timing = lo(); s.technique = lo(); s.power = lo();
      break;
    case "Swing Bowler":
      s.movement += 12; s.accuracy += 8; s.pace += 2; s.timing = lo(); s.technique = lo(); s.power = lo();
      break;
    case "Off-Spinner":
      s.movement += 10; s.accuracy += 8; s.variation += 6; s.pace = lo(); s.timing = lo(); s.power = lo();
      break;
    case "Leg-Spinner":
      s.variation += 12; s.movement += 8; s.accuracy += 4; s.pace = lo(); s.timing = lo(); s.power = lo();
      break;
  }
  // Clamp
  (Object.keys(s) as Array<keyof Skills>).forEach((k) => {
    s[k] = Math.max(20, Math.min(75, s[k]));
  });
  return s;
}

export function emptyStats(): CareerStats {
  return {
    matches: 0,
    innings: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    notOuts: 0,
    highestScore: 0,
    oversBowled: 0,
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
    fiveFors: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    catches: 0,
    manOfMatch: 0,
  };
}

const COMPETITIONS = [
  "Club Premier League",
  "State Shield",
  "T20 Blast",
  "National A Tour",
  "International Tour",
  "Franchise T20",
];

const OPPONENTS = [
  "Northern Stars", "Southern Lions", "Eastern Tigers", "Western Eagles",
  "Coastal Sharks", "Capital Royals", "Highland Hawks", "Valley Knights",
  "Desert Falcons", "River Pirates",
];

export function generateFixtures(year: number, tier: Player["tier"]): Fixture[] {
  const list: Fixture[] = [];
  // Generate a fixture roughly every 2 weeks across the year (52 weeks)
  for (let w = 2; w <= 50; w += 2) {
    // Higher tiers get more competitions
    const compPool: string[] = (() => {
      switch (tier) {
        case "Club": return ["Club Premier League"];
        case "Domestic": return ["Club Premier League", "State Shield", "T20 Blast"];
        case "National A": return ["State Shield", "T20 Blast", "National A Tour"];
        case "International": return ["International Tour", "Franchise T20", "T20 Blast"];
        case "Franchise T20": return ["Franchise T20", "T20 Blast", "International Tour"];
      }
    })();
    const comp = compPool[rand(0, compPool.length - 1)];
    const fmt: Fixture["format"] = comp.includes("T20") || comp === "Franchise T20"
      ? "T20"
      : comp === "International Tour"
        ? (Math.random() < 0.5 ? "ODI" : "Test")
        : "Club";
    list.push({
      id: id(),
      week: w,
      year,
      competition: comp,
      opponent: OPPONENTS[rand(0, OPPONENTS.length - 1)],
      format: fmt,
      venue: Math.random() < 0.5 ? "Home" : "Away",
      played: false,
    });
  }
  return list;
}

export function welcomeMessage(player: Player): InboxMessage {
  return {
    id: id(),
    week: 1,
    year: 2026,
    from: `${player.team} — Head Coach`,
    subject: "Welcome to the squad",
    body:
      `${player.name}, welcome to ${player.team}. We've got high hopes for you this season. ` +
      `Train hard, play smart, and earn your spot. Your first fixture is coming up in week 2 — ` +
      `make it count.`,
    read: false,
    type: "coach",
  };
}

export function newCareer(input: {
  name: string;
  nation: Nation;
  role: Role;
}): SaveGame {
  const team = NATION_CLUBS[input.nation][rand(0, NATION_CLUBS[input.nation].length - 1)];
  const player: Player = {
    id: id(),
    name: input.name,
    nation: input.nation,
    role: input.role,
    age: 17,
    skills: startingSkills(input.role),
    potential: rand(72, 94),
    fitness: 80,
    confidence: 55,
    morale: 70,
    cash: 0,
    tier: "Club",
    team,
    perks: [],
    retired: false,
  };
  const save: SaveGame = {
    version: 1,
    player,
    stats: emptyStats(),
    weekStats: emptyStats(),
    seasonStats: emptyStats(),
    fixtures: generateFixtures(2026, "Club"),
    inbox: [welcomeMessage(player)],
    week: 1,
    year: 2026,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    notesUnlocked: [],
    leagues: createLeaguesState(2026),
    offerYears: [],
    contractValue: 0,
  };
  return save;
}

export { id as makeId };
