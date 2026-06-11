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

export function generateFixtures(
  year: number,
  tier: Player["tier"],
  player?: Player,
  slots?: ContractSlots | null,
  priorities?: string[] | null,
  tournaments?: import("./tournaments").TournamentsState | null,
): Fixture[] {
  const list: Fixture[] = [];
  const playerTeam = player?.team ?? "";
  const playerLeague = playerTeam ? findLeagueForTeam(playerTeam) : null;
  const norm = normalizeSlots(slots);
  const prioList = (priorities && priorities.length > 0)
    ? priorities
    : ["ICC", "International", "National A", "IPL", "BBL", "PSL", "County", "Club"];
  const rank = (key: string): number => {
    const i = prioList.indexOf(key);
    return i < 0 ? 999 : i;
  };

  // Build commitment sources from active contracts. Each source can propose a
  // fixture per week (probabilistically). When multiple sources propose for the
  // same week, the user's priority order picks the winner — so e.g. an ICC
  // World Cup week overrides an IPL week if the user ranks ICC above IPL.
  type Candidate = {
    key: string;
    build: () => Omit<Fixture, "id" | "week" | "year" | "played"> | null;
    // Per-week chance this source has a fixture
    prob: number;
  };
  const sources: Array<{ key: string; prob: number; pickFixture: () => ReturnType<Candidate["build"]> }> = [];

  for (const f of norm.franchises) {
    const lg = f.league as LeagueId;
    sources.push({
      key: f.league,
      prob: 0.7,
      pickFixture: () => ({
        competition: f.league,
        opponent: pickLeagueOpponent(f.team, lg),
        format: f.league === "County" ? (Math.random() < 0.5 ? "Test" : "T20") : "T20",
        venue: Math.random() < 0.5 ? "Home" : "Away",
        team: f.team,
      }),
    });
  }
  if (norm.nation && player) {
    const natTeam = norm.nation.team;
    sources.push({
      key: "International",
      prob: 0.7,
      pickFixture: () => ({
        competition: `${player.nation} Tour`,
        opponent: pickInternationalOpponent(player),
        format: pickInternationalFormat(),
        venue: Math.random() < 0.5 ? "Home" : "Away",
        team: natTeam,
      }),
    });
  }
  if (norm.nationA && player) {
    const natATeam = norm.nationA.team;
    sources.push({
      key: "National A",
      prob: 0.7,
      pickFixture: () => ({
        competition: `${player.nation} A Tour`,
        opponent: pickNationalAOpponent(player),
        format: Math.random() < 0.55 ? "ODI" : "T20",
        venue: Math.random() < 0.5 ? "Home" : "Away",
        team: natATeam,
      }),
    });
  }
  // ICC tournament source: when an active tournament covers a week, the player's
  // nation is treated as participating and a representative fixture is generated.
  // This guarantees World Cup weeks beat club/franchise commitments when the
  // user ranks "ICC" highest.
  const iccWindows: Array<{ startWeek: number; endWeek: number; comp: string; format: Fixture["format"] }> = [];
  if (tournaments && player) {
    for (const t of tournaments.active) {
      if (t.year !== year || t.finished) continue;
      iccWindows.push({
        startWeek: t.startWeek,
        endWeek: t.endWeek,
        comp: t.name,
        format: (t.format === "Test" ? "Test" : t.format === "ODI" ? "ODI" : "T20"),
      });
    }
  }

  // Legacy fallback when the player has no signed contracts at all
  if (sources.length === 0) {
    sources.push({
      key: tier === "Club" ? "Club" : "Club",
      prob: 0.55,
      pickFixture: () => {
        const baseTeam = playerTeam;
        if (tier === "Club") {
          return { competition: "Club Premier League", opponent: pickClubOpponent(), format: "Club", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
        }
        if (tier === "Domestic" || tier === "National A") {
          const r = Math.random();
          if (r < 0.4) return { competition: "T20 Blast", opponent: pickClubOpponent(), format: "T20", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
          if (r < 0.75) return { competition: "State Shield", opponent: pickClubOpponent(), format: "Club", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
          return { competition: "County Championship", opponent: pickClubOpponent(), format: "Test", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
        }
        if (tier === "International" && player) {
          return { competition: `${player.nation} Tour`, opponent: pickInternationalOpponent(player), format: pickInternationalFormat(), venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
        }
        if (tier === "Franchise T20" && playerLeague) {
          return { competition: playerLeague, opponent: pickLeagueOpponent(playerTeam, playerLeague), format: "T20", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
        }
        return { competition: "Friendly", opponent: pickClubOpponent(), format: "T20", venue: Math.random() < 0.5 ? "Home" : "Away", team: baseTeam };
      },
    });
  }

  // 52-week schedule. Each week, collect every source's candidate, then keep
  // the one with the best priority rank.
  for (let w = 2; w <= 51; w++) {
    const blockWk = ((w - 1) % 10) + 1;
    if (blockWk === 9) continue; // rest week

    type Pick = { key: string; data: NonNullable<ReturnType<Candidate["build"]>> };
    const candidates: Pick[] = [];

    // ICC candidate (deterministic when window covers this week)
    for (const win of iccWindows) {
      if (w >= win.startWeek && w <= win.endWeek && player) {
        candidates.push({
          key: "ICC",
          data: {
            competition: win.comp,
            opponent: pickInternationalOpponent(player),
            format: win.format,
            venue: Math.random() < 0.5 ? "Home" : "Neutral",
            team: `${player.nation} National Team`,
          },
        });
        break;
      }
    }

    for (const s of sources) {
      if (Math.random() > s.prob) continue;
      const data = s.pickFixture();
      if (!data) continue;
      candidates.push({ key: s.key, data });
    }

    if (candidates.length === 0) continue;
    candidates.sort((a, b) => rank(a.key) - rank(b.key));
    const winner = candidates[0];
    list.push({
      id: id(),
      week: w,
      year,
      competition: winner.data.competition,
      opponent: winner.data.opponent,
      format: winner.data.format,
      venue: winner.data.venue,
      team: (winner.data as { team?: string }).team,
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
    contractSlots: { franchises: [], nation: null, nationA: null },
    tournaments: { active: newTournamentsForYear(2026), history: [] },
    matchInProgress: null,
  };
  return save;
}

export { id as makeId };
