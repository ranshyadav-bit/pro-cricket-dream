import type {
  CareerStats,
  ContractSlots,
  Fixture,
  InboxMessage,
  Nation,
  Player,
  Role,
  SaveGame,
  Skills,
} from "./types";
import { normalizeSlots } from "./types";
import { createLeaguesState } from "./leagues";
import { newTournamentsForYear } from "./tournaments";
import { findLeagueForTeam, pickClubOpponent, pickInternationalOpponent, pickLeagueOpponent, pickNationalAOpponent } from "./opponents";
import type { LeagueId } from "./rosters";

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
  const base = (): number => rand(45, 58);
  const lo = (): number => rand(35, 48);
  const s: Skills = {
    timing: base(), technique: base(), power: base(), patience: base(),
    pace: base(), accuracy: base(), movement: base(), variation: base(),
    fitness: rand(60, 75), composure: rand(45, 60),
  };
  switch (role) {
    case "Top-Order Bat":
      s.timing += 8; s.technique += 8; s.patience += 6; s.pace = lo(); s.movement = lo(); s.variation = lo(); break;
    case "Middle-Order Bat":
      s.timing += 6; s.technique += 4; s.power += 4; s.pace = lo(); s.movement = lo(); s.variation = lo(); break;
    case "Finisher":
      s.power += 12; s.timing += 4; s.composure += 6; s.pace = lo(); s.movement = lo(); break;
    case "Wicket-Keeper Bat":
      s.timing += 6; s.technique += 4; s.composure += 4; s.pace = lo(); s.movement = lo(); s.variation = lo(); break;
    case "All-Rounder":
      s.timing += 4; s.power += 2; s.pace += 4; s.accuracy += 4; s.movement += 2; break;
    case "Pace Bowler":
      s.pace += 12; s.accuracy += 6; s.movement += 4; s.timing = lo(); s.technique = lo(); s.power = lo(); break;
    case "Swing Bowler":
      s.movement += 12; s.accuracy += 8; s.pace += 2; s.timing = lo(); s.technique = lo(); s.power = lo(); break;
    case "Off-Spinner":
      s.movement += 10; s.accuracy += 8; s.variation += 6; s.pace = lo(); s.timing = lo(); s.power = lo(); break;
    case "Leg-Spinner":
      s.variation += 12; s.movement += 8; s.accuracy += 4; s.pace = lo(); s.timing = lo(); s.power = lo(); break;
  }
  (Object.keys(s) as Array<keyof Skills>).forEach((k) => {
    s[k] = Math.max(20, Math.min(75, s[k]));
  });
  return s;
}

export function emptyStats(): CareerStats {
  return {
    matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
    fifties: 0, hundreds: 0, notOuts: 0, highestScore: 0,
    oversBowled: 0, ballsBowled: 0, runsConceded: 0, wickets: 0,
    fiveFors: 0, bestBowlingWickets: 0, bestBowlingRuns: 0,
    catches: 0, manOfMatch: 0,
  };
}

// Format mix per tier — used to pick T20 / ODI / Test for international weeks
function pickInternationalFormat(): "T20" | "ODI" | "Test" {
  const r = Math.random();
  if (r < 0.4) return "T20";
  if (r < 0.75) return "ODI";
  return "Test";
}

export function generateFixtures(year: number, tier: Player["tier"], player?: Player, slots?: ContractSlots | null): Fixture[] {
  const list: Fixture[] = [];
  const playerTeam = player?.team ?? "";
  const playerLeague = playerTeam ? findLeagueForTeam(playerTeam) : null;
  const norm = normalizeSlots(slots);

  // Build commitment sources from active contracts. Each source produces one fixture
  // when chosen for a week. We weave them so the player can play IPL one week, an
  // India A tour the next, an ODI bilateral the next, etc.
  type Source = {
    label: "FRA" | "NAT" | "NA" | "CLU";
    pickFixture: () => { competition: string; opponent: string; format: Fixture["format"] };
  };
  const sources: Source[] = [];

  for (const f of norm.franchises) {
    const lg = f.league as LeagueId;
    sources.push({
      label: "FRA",
      pickFixture: () => ({
        competition: f.league,
        opponent: pickLeagueOpponent(f.team, lg),
        format: f.league === "County" ? (Math.random() < 0.5 ? "Test" : "T20") : "T20",
      }),
    });
  }
  if (norm.nation && player) {
    sources.push({
      label: "NAT",
      pickFixture: () => ({
        competition: `${player.nation} Tour`,
        opponent: pickInternationalOpponent(player),
        format: pickInternationalFormat(),
      }),
    });
  }
  if (norm.nationA && player) {
    sources.push({
      label: "NA",
      pickFixture: () => ({
        competition: `${player.nation} A Tour`,
        opponent: pickNationalAOpponent(player),
        format: Math.random() < 0.55 ? "ODI" : "T20",
      }),
    });
  }
  // Legacy fallback when the player has no signed contracts at all:
  // derive a single source from the tier/team (original behaviour).
  if (sources.length === 0) {
    sources.push({
      label: "CLU",
      pickFixture: () => {
        if (tier === "Club") {
          return { competition: "Club Premier League", opponent: pickClubOpponent(), format: "Club" };
        }
        if (tier === "Domestic" || tier === "National A") {
          const r = Math.random();
          if (r < 0.4) return { competition: "T20 Blast", opponent: pickClubOpponent(), format: "T20" };
          if (r < 0.75) return { competition: "State Shield", opponent: pickClubOpponent(), format: "Club" };
          return { competition: "County Championship", opponent: pickClubOpponent(), format: "Test" };
        }
        if (tier === "International" && player) {
          return { competition: `${player.nation} Tour`, opponent: pickInternationalOpponent(player), format: pickInternationalFormat() };
        }
        if (tier === "Franchise T20" && playerLeague) {
          return { competition: playerLeague, opponent: pickLeagueOpponent(playerTeam, playerLeague), format: "T20" };
        }
        return { competition: "Friendly", opponent: pickClubOpponent(), format: "T20" };
      },
    });
  }

  // 52-week schedule. Walk every week, cycle through sources, leave rest weeks.
  let cursor = 0;
  for (let w = 2; w <= 51; w++) {
    const blockWk = ((w - 1) % 10) + 1;
    // Two rest weeks per 10-week block for recovery
    if (blockWk === 9) continue;
    // Slightly thin out the calendar when there are few sources
    if (sources.length === 1 && sources[0].label === "CLU" && tier === "Club" && w % 2 !== 0) continue;

    const src = sources[cursor % sources.length];
    cursor++;
    const pick = src.pickFixture();
    list.push({
      id: id(),
      week: w,
      year,
      competition: pick.competition,
      opponent: pick.opponent,
      format: pick.format,
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
      `Train hard, play smart, and earn your spot. Your first fixture is coming up — make it count.`,
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
    fixtures: generateFixtures(2026, "Club", player),
    inbox: [welcomeMessage(player)],
    week: 1,
    year: 2026,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    notesUnlocked: [],
    leagues: createLeaguesState(2026),
    offerYears: [],
    contractValue: 0,
    contractSlots: { franchise: null, nation: null },
    tournaments: { active: newTournamentsForYear(2026), history: [] },
    matchInProgress: null,
  };
  return save;
}

export { id as makeId };
