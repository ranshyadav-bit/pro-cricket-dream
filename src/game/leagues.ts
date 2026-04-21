// Parallel simulation of IPL, BBL, PSL, County leagues running alongside the player's career.
// Generates fixtures, simulates results week-by-week, tracks standings + Orange/Purple Cap.

import type { LeagueId, RosterPlayer } from "./rosters";
import { LEAGUE_BY_ID, LEAGUE_FORMAT, LEAGUE_LABEL } from "./rosters";

export type LeagueFixture = {
  id: string;
  week: number; // 1-52 within the league season
  home: string; // team id
  away: string;
  played: boolean;
  homeRuns?: number;
  homeWickets?: number;
  awayRuns?: number;
  awayWickets?: number;
  winner?: string; // team id
  // Top performer in this match — credited to leaderboard
  topScorer?: { teamId: string; player: string; runs: number };
  topWicketTaker?: { teamId: string; player: string; wickets: number; runs: number };
};

export type LeagueStanding = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number; // 2 per win, 1 per tie
  nrr: number; // net run rate (rough)
};

export type LeaderboardEntry = {
  player: string;
  teamId: string;
  matches: number;
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
};

export type LeagueSeason = {
  league: LeagueId;
  year: number;
  // Week range within the in-game year (e.g. IPL: weeks 14-22)
  startWeek: number;
  endWeek: number;
  fixtures: LeagueFixture[];
  standings: Record<string, LeagueStanding>;
  battingLeaders: Record<string, LeaderboardEntry>; // by player name
  bowlingLeaders: Record<string, LeaderboardEntry>; // by player name
  champion?: string; // teamId
  finalsPlayed: boolean;
};

export type LeaguesState = {
  year: number;
  seasons: Record<LeagueId, LeagueSeason>;
};

// League calendar windows (weeks of in-game year)
const LEAGUE_WINDOWS: Record<LeagueId, [number, number]> = {
  IPL:    [14, 24], // Mar–May
  PSL:    [6, 14],  // Feb–Apr
  BBL:    [50, 8],  // wraps year-end (we'll handle as 50-52 + 1-8)
  County: [16, 38], // Apr–Sep
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function rngFromSeed(seedStr: string): () => number {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function emptyStanding(teamId: string): LeagueStanding {
  return { teamId, played: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, points: 0, nrr: 0 };
}

function generateLeagueFixtures(league: LeagueId, year: number): LeagueFixture[] {
  const teams = LEAGUE_BY_ID[league];
  const [start, end] = LEAGUE_WINDOWS[league];
  const totalWeeks = end >= start ? end - start + 1 : (52 - start + 1) + end;
  // Each pair plays once (single round-robin) — total = T*(T-1)/2 fixtures
  // Distribute across weeks
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push([teams[i].id, teams[j].id]);
    }
  }
  const rng = rngFromSeed(`${league}-${year}`);
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  const fixtures: LeagueFixture[] = [];
  pairs.forEach((pair, idx) => {
    const wkOffset = Math.floor(idx / 4); // ~4 matches per week
    let wk: number;
    if (end >= start) {
      wk = start + (wkOffset % totalWeeks);
    } else {
      const offsetMod = wkOffset % totalWeeks;
      const firstChunk = 52 - start + 1;
      wk = offsetMod < firstChunk ? start + offsetMod : 1 + (offsetMod - firstChunk);
    }
    fixtures.push({
      id: makeId(),
      week: wk,
      home: rng() < 0.5 ? pair[0] : pair[1],
      away: rng() < 0.5 ? pair[1] : pair[0],
      played: false,
    });
  });
  return fixtures;
}

export function createLeagueSeason(league: LeagueId, year: number): LeagueSeason {
  const [start, end] = LEAGUE_WINDOWS[league];
  const teams = LEAGUE_BY_ID[league];
  const standings: Record<string, LeagueStanding> = {};
  for (const t of teams) standings[t.id] = emptyStanding(t.id);
  return {
    league,
    year,
    startWeek: start,
    endWeek: end,
    fixtures: generateLeagueFixtures(league, year),
    standings,
    battingLeaders: {},
    bowlingLeaders: {},
    finalsPlayed: false,
  };
}

export function createLeaguesState(year: number): LeaguesState {
  return {
    year,
    seasons: {
      IPL: createLeagueSeason("IPL", year),
      BBL: createLeagueSeason("BBL", year),
      PSL: createLeagueSeason("PSL", year),
      County: createLeagueSeason("County", year),
    },
  };
}

// Simulate a single fixture with realistic runs/wickets per format
function simulateFixture(league: LeagueId, fixture: LeagueFixture): LeagueFixture {
  const teams = LEAGUE_BY_ID[league];
  const home = teams.find((t) => t.id === fixture.home)!;
  const away = teams.find((t) => t.id === fixture.away)!;
  const fmt = LEAGUE_FORMAT[league];

  const homeStrength = avgRating(home.squad) + 3; // home advantage
  const awayStrength = avgRating(away.squad);

  function totalForTeam(strength: number): { runs: number; wickets: number } {
    let baseRuns: number;
    if (fmt === "T20") baseRuns = 130 + (strength - 75) * 3;
    else if (fmt === "ODI") baseRuns = 240 + (strength - 75) * 5;
    else baseRuns = 280 + (strength - 75) * 6; // Test 1st innings approx
    const variance = (Math.random() - 0.5) * (fmt === "T20" ? 60 : 100);
    const runs = Math.max(60, Math.round(baseRuns + variance));
    const wickets = Math.min(10, Math.max(2, 10 - Math.round((runs / (fmt === "T20" ? 18 : 30)) - 4) + Math.floor(Math.random() * 3)));
    return { runs, wickets };
  }

  const h = totalForTeam(homeStrength);
  const a = totalForTeam(awayStrength);

  const tied = h.runs === a.runs;
  const winner = tied ? undefined : h.runs > a.runs ? home.id : away.id;

  // Pick a top scorer & top wicket-taker based on rating-weighted random
  const topScorerTeam = h.runs >= a.runs ? home : away;
  const topScorerRuns = Math.max(h.runs, a.runs);
  const topScorer = pickTopBatter(topScorerTeam.squad, fmt, topScorerRuns);

  const bowlingTeam = topScorerTeam.id === home.id ? away : home;
  const bowlingTotal = topScorerTeam.id === home.id ? a.wickets : h.wickets;
  const topBowler = pickTopBowler(bowlingTeam.squad, bowlingTotal);
  const conceded = Math.round((topScorerTeam.id === home.id ? h.runs : a.runs) * 0.18 + Math.random() * 12);

  return {
    ...fixture,
    played: true,
    homeRuns: h.runs,
    homeWickets: h.wickets,
    awayRuns: a.runs,
    awayWickets: a.wickets,
    winner,
    topScorer: { teamId: topScorerTeam.id, player: topScorer.name, runs: topScorer.runs },
    topWicketTaker: { teamId: bowlingTeam.id, player: topBowler.name, wickets: topBowler.wickets, runs: conceded },
  };
}

function avgRating(squad: RosterPlayer[]): number {
  return squad.reduce((s, p) => s + p.rating, 0) / squad.length;
}

function pickTopBatter(squad: RosterPlayer[], fmt: "T20" | "ODI" | "Test" | "Club", teamTotal: number) {
  const batters = squad.filter((p) => !p.role.includes("Bowler") && !p.role.includes("Spinner"));
  const pool = batters.length ? batters : squad;
  // Weighted pick by rating
  const weights = pool.map((p) => Math.pow(p.rating - 60, 2) + 5);
  const sum = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * sum;
  let pick = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) { pick = pool[i]; break; }
  }
  // Star runs = portion of team total
  const portion = fmt === "T20" ? 0.32 : fmt === "ODI" ? 0.28 : 0.34;
  const runs = Math.max(15, Math.round(teamTotal * portion + (Math.random() - 0.4) * (fmt === "T20" ? 30 : 50)));
  return { name: pick.name, runs };
}

function pickTopBowler(squad: RosterPlayer[], _wicketsLost: number) {
  const bowlers = squad.filter((p) => p.role.includes("Bowler") || p.role.includes("Spinner") || p.role === "All-Rounder");
  const pool = bowlers.length ? bowlers : squad;
  const weights = pool.map((p) => Math.pow(p.rating - 60, 2) + 5);
  const sum = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * sum;
  let pick = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) { pick = pool[i]; break; }
  }
  const wickets = Math.min(5, Math.max(1, Math.round(1 + Math.random() * 3 + (pick.rating - 70) / 15)));
  return { name: pick.name, wickets };
}

// Apply a simulated fixture to a season's standings + leaderboards
function applyFixtureToSeason(season: LeagueSeason, fx: LeagueFixture): void {
  const home = season.standings[fx.home];
  const away = season.standings[fx.away];
  if (!home || !away) return;
  home.played += 1; away.played += 1;
  home.pointsFor += fx.homeRuns ?? 0; home.pointsAgainst += fx.awayRuns ?? 0;
  away.pointsFor += fx.awayRuns ?? 0; away.pointsAgainst += fx.homeRuns ?? 0;
  if (fx.winner === fx.home) { home.wins += 1; away.losses += 1; home.points += 2; }
  else if (fx.winner === fx.away) { away.wins += 1; home.losses += 1; away.points += 2; }
  else { home.ties += 1; away.ties += 1; home.points += 1; away.points += 1; }
  home.nrr = (home.pointsFor - home.pointsAgainst) / Math.max(1, home.played * 20);
  away.nrr = (away.pointsFor - away.pointsAgainst) / Math.max(1, away.played * 20);

  // Leaderboards
  if (fx.topScorer) {
    const k = fx.topScorer.player;
    const cur = season.battingLeaders[k] ?? { player: k, teamId: fx.topScorer.teamId, matches: 0, runs: 0 };
    cur.matches += 1;
    cur.runs = (cur.runs ?? 0) + fx.topScorer.runs;
    cur.average = (cur.runs ?? 0) / cur.matches;
    cur.strikeRate = 130 + Math.round((cur.average! - 30) * 0.6);
    season.battingLeaders[k] = cur;
  }
  if (fx.topWicketTaker) {
    const k = fx.topWicketTaker.player;
    const cur = season.bowlingLeaders[k] ?? { player: k, teamId: fx.topWicketTaker.teamId, matches: 0, wickets: 0 };
    cur.matches += 1;
    cur.wickets = (cur.wickets ?? 0) + fx.topWicketTaker.wickets;
    cur.economy = 7.0 + (Math.random() - 0.5) * 2;
    cur.average = (fx.topWicketTaker.runs * cur.matches) / Math.max(1, cur.wickets!);
    season.bowlingLeaders[k] = cur;
  }
}

// Advance leagues to "currentWeek" of "currentYear" — sim any unplayed fixtures up to that point
export function advanceLeagues(state: LeaguesState, currentWeek: number, currentYear: number): LeaguesState {
  // If year changed, regen
  if (state.year !== currentYear) {
    state = createLeaguesState(currentYear);
  }
  for (const lid of Object.keys(state.seasons) as LeagueId[]) {
    const season = state.seasons[lid];
    const inWindow = (w: number): boolean => {
      const [s, e] = [season.startWeek, season.endWeek];
      if (e >= s) return w >= s && w <= e;
      return w >= s || w <= e;
    };
    for (const fx of season.fixtures) {
      if (fx.played) continue;
      if (inWindow(fx.week) && (fx.week <= currentWeek || (season.endWeek < season.startWeek && fx.week <= currentWeek))) {
        const simmed = simulateFixture(lid, fx);
        Object.assign(fx, simmed);
        applyFixtureToSeason(season, fx);
      }
    }
    // Champion: when all fixtures done, top of table = champion
    if (!season.finalsPlayed && season.fixtures.every((f) => f.played)) {
      const sorted = Object.values(season.standings).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
      season.champion = sorted[0]?.teamId;
      season.finalsPlayed = true;
    }
  }
  return state;
}

// Sorted standings
export function getStandings(season: LeagueSeason): LeagueStanding[] {
  return Object.values(season.standings).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

export function getOrangeCap(season: LeagueSeason, limit = 10): LeaderboardEntry[] {
  return Object.values(season.battingLeaders)
    .sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))
    .slice(0, limit);
}

export function getPurpleCap(season: LeagueSeason, limit = 10): LeaderboardEntry[] {
  return Object.values(season.bowlingLeaders)
    .sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))
    .slice(0, limit);
}

// Inject the player's match performance into a league's leaderboards (when they actually played)
export function recordPlayerInLeague(
  state: LeaguesState,
  league: LeagueId,
  playerName: string,
  teamId: string,
  perf: { runs: number; wickets: number; runsConceded: number },
): void {
  const season = state.seasons[league];
  if (!season) return;
  if (perf.runs > 0) {
    const cur = season.battingLeaders[playerName] ?? { player: playerName, teamId, matches: 0, runs: 0 };
    cur.matches += 1;
    cur.runs = (cur.runs ?? 0) + perf.runs;
    cur.average = (cur.runs ?? 0) / cur.matches;
    cur.strikeRate = 130 + Math.round((cur.average! - 30) * 0.6);
    season.battingLeaders[playerName] = cur;
  }
  if (perf.wickets > 0) {
    const cur = season.bowlingLeaders[playerName] ?? { player: playerName, teamId, matches: 0, wickets: 0 };
    cur.matches += 1;
    cur.wickets = (cur.wickets ?? 0) + perf.wickets;
    cur.economy = 7.0;
    cur.average = (perf.runsConceded * cur.matches) / Math.max(1, cur.wickets);
    season.bowlingLeaders[playerName] = cur;
  }
}

export { LEAGUE_BY_ID, LEAGUE_LABEL, LEAGUE_FORMAT };
