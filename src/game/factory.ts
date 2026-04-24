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
import { newTournamentsForYear } from "./tournaments";
import { findLeagueForTeam, pickClubOpponent, pickInternationalOpponent, pickLeagueOpponent, pickNationalAOpponent } from "./opponents";

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

export function generateFixtures(year: number, tier: Player["tier"], player?: Player): Fixture[] {
  const list: Fixture[] = [];
  const playerTeam = player?.team ?? "";
  const playerLeague = playerTeam ? findLeagueForTeam(playerTeam) : null;
  const isNationalTeam = playerTeam.includes("National Team");
  const isNationalA = playerTeam.endsWith(" A") || tier === "National A";

  // 52-week schedule. Goal: ~3 league games every 10 weeks + many internationals at top tiers.
  // Approach: walk every week, decide if we have a fixture and what kind.
  for (let w = 2; w <= 51; w++) {
    let competition: string;
    let opponent: string;
    let format: Fixture["format"];

    if (tier === "Club") {
      // Club tier — club v club only, every 2 weeks
      if (w % 2 !== 0) continue;
      competition = "Club Premier League";
      opponent = pickClubOpponent();
      format = "Club";
    } else if (tier === "Domestic" || tier === "National A") {
      // Domestic — local club/state opponents only (never national teams)
      if (w % 2 !== 0 && Math.random() < 0.5) continue;
      if (isNationalA) {
        competition = `${player?.nation ?? "National"} A Tour`;
        opponent = player ? pickNationalAOpponent(player) : "Touring A";
        format = Math.random() < 0.55 ? "ODI" : "T20";
      } else {
        const r = Math.random();
        if (r < 0.4) { competition = "T20 Blast"; format = "T20"; }
        else if (r < 0.75) { competition = "State Shield"; format = "Club"; }
        else { competition = "County Championship"; format = "Test"; }
        opponent = pickClubOpponent();
      }
    } else if (tier === "International") {
      // International — denser schedule.
      // 10-week block: 1-3 league (T20 league v league), 4-7 international, 8-9 rest, 10 international.
      const blockWk = ((w - 1) % 10) + 1;
      if (blockWk <= 3 && playerLeague && !isNationalTeam) {
        // League block — STRICTLY league v league (always 20 overs)
        competition = playerLeague;
        opponent = pickLeagueOpponent(playerTeam, playerLeague);
        format = "T20";
      } else if (blockWk === 8 || blockWk === 9) {
        continue; // rest week
      } else {
        // International bilateral — country v country, T20/ODI/Test only
        if (player) {
          competition = `${player.nation} Tour`;
          opponent = pickInternationalOpponent(player);
        } else {
          competition = "International Tour";
          opponent = "Touring XI";
        }
        format = pickInternationalFormat();
      }
    } else {
      // Franchise T20 tier — league v league only (T20)
      const blockWk = ((w - 1) % 10) + 1;
      if (blockWk === 8 || blockWk === 9) continue;
      if (playerLeague) {
        competition = playerLeague;
        opponent = pickLeagueOpponent(playerTeam, playerLeague);
      } else {
        competition = "Franchise T20";
        opponent = "Visiting XI";
      }
      format = "T20";
    }

    list.push({
      id: id(),
      week: w,
      year,
      competition,
      opponent,
      format,
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
