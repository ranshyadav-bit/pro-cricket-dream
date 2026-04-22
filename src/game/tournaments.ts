// ICC tournaments: T20 World Cup, ODI World Cup, World Test Championship.
// Cycles every few years. Player can be invited to play for their nation.

import type { Nation } from "./types";

export type TournamentId = "T20WC" | "ODIWC" | "WTC";

export type TournamentFormat = "T20" | "ODI" | "Test";

export type TournamentMatch = {
  id: string;
  week: number; // in-game week
  home: Nation;
  away: Nation;
  played: boolean;
  homeRuns?: number;
  homeWickets?: number;
  awayRuns?: number;
  awayWickets?: number;
  winner?: Nation;
  stage: "Group" | "Super 8" | "Semi" | "Final";
};

export type TournamentStanding = {
  nation: Nation;
  played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
};

export type Tournament = {
  id: TournamentId;
  name: string;
  format: TournamentFormat;
  year: number;
  startWeek: number;
  endWeek: number;
  host: Nation;
  matches: TournamentMatch[];
  standings: Record<Nation, TournamentStanding>;
  champion?: Nation;
  finished: boolean;
};

export type TournamentsState = {
  active: Tournament[];
  history: Array<{ id: TournamentId; year: number; champion: Nation }>;
};

const ALL_NATIONS: Nation[] = [
  "India", "Australia", "England", "Pakistan", "South Africa",
  "New Zealand", "West Indies", "Sri Lanka", "Bangladesh",
];

export const TOURNAMENT_META: Record<TournamentId, { name: string; format: TournamentFormat; cycleYears: number; startWeek: number; durationWeeks: number }> = {
  T20WC: { name: "ICC T20 World Cup",  format: "T20",  cycleYears: 2, startWeek: 22, durationWeeks: 5 },
  ODIWC: { name: "ICC ODI World Cup",  format: "ODI",  cycleYears: 4, startWeek: 40, durationWeeks: 6 },
  WTC:   { name: "World Test Championship Final", format: "Test", cycleYears: 2, startWeek: 25, durationWeeks: 2 },
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Determine which tournaments start in a given year
export function tournamentsForYear(year: number): TournamentId[] {
  const list: TournamentId[] = [];
  // T20 WC: every 2 years starting 2026 (2026, 2028, 2030...)
  if ((year - 2026) % 2 === 0) list.push("T20WC");
  // ODI WC: every 4 years starting 2027
  if ((year - 2027) % 4 === 0) list.push("ODIWC");
  // WTC Final: every 2 years starting 2027
  if ((year - 2027) % 2 === 0) list.push("WTC");
  return list;
}

function emptyStanding(nation: Nation): TournamentStanding {
  return { nation, played: 0, wins: 0, losses: 0, points: 0, nrr: 0 };
}

export function createTournament(id: TournamentId, year: number): Tournament {
  const meta = TOURNAMENT_META[id];
  const host = ALL_NATIONS[Math.floor(Math.random() * ALL_NATIONS.length)];
  const standings: Record<string, TournamentStanding> = {};
  for (const n of ALL_NATIONS) standings[n] = emptyStanding(n);

  const matches: TournamentMatch[] = [];

  if (id === "WTC") {
    // Single final between top 2 (random for sim)
    const shuffled = [...ALL_NATIONS].sort(() => Math.random() - 0.5);
    matches.push({
      id: makeId(),
      week: meta.startWeek + 1,
      home: shuffled[0],
      away: shuffled[1],
      played: false,
      stage: "Final",
    });
  } else {
    // Group stage: each nation plays 4 group matches
    const pool = [...ALL_NATIONS];
    const pairs: Array<[Nation, Nation]> = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (Math.random() < 0.6) pairs.push([pool[i], pool[j]]);
      }
    }
    pairs.forEach((p, idx) => {
      const wkOffset = Math.floor(idx / 3); // 3 matches per week
      matches.push({
        id: makeId(),
        week: meta.startWeek + (wkOffset % (meta.durationWeeks - 2)),
        home: p[0],
        away: p[1],
        played: false,
        stage: "Group",
      });
    });
    // 2 semifinals + 1 final placeholder
    matches.push({
      id: makeId(), week: meta.startWeek + meta.durationWeeks - 2,
      home: ALL_NATIONS[0], away: ALL_NATIONS[1], played: false, stage: "Semi",
    });
    matches.push({
      id: makeId(), week: meta.startWeek + meta.durationWeeks - 2,
      home: ALL_NATIONS[2], away: ALL_NATIONS[3], played: false, stage: "Semi",
    });
    matches.push({
      id: makeId(), week: meta.startWeek + meta.durationWeeks - 1,
      home: ALL_NATIONS[0], away: ALL_NATIONS[2], played: false, stage: "Final",
    });
  }

  return {
    id, name: meta.name, format: meta.format, year,
    startWeek: meta.startWeek,
    endWeek: meta.startWeek + meta.durationWeeks,
    host,
    matches,
    standings: standings as Record<Nation, TournamentStanding>,
    finished: false,
  };
}

function simMatch(m: TournamentMatch, format: TournamentFormat): TournamentMatch {
  const baseRuns = format === "T20" ? 165 : format === "ODI" ? 270 : 320;
  const variance = format === "T20" ? 60 : 90;
  const h = Math.max(80, Math.round(baseRuns + (Math.random() - 0.5) * variance));
  const a = Math.max(80, Math.round(baseRuns + (Math.random() - 0.5) * variance));
  const winner: Nation | undefined = h === a ? undefined : (h > a ? m.home : m.away);
  const wH = Math.min(10, Math.max(2, 10 - Math.round((h / 25) - 5) + Math.floor(Math.random() * 3)));
  const wA = Math.min(10, Math.max(2, 10 - Math.round((a / 25) - 5) + Math.floor(Math.random() * 3)));
  return { ...m, played: true, homeRuns: h, homeWickets: wH, awayRuns: a, awayWickets: wA, winner };
}

function applyResult(t: Tournament, m: TournamentMatch): void {
  if (!m.played) return;
  const home = t.standings[m.home];
  const away = t.standings[m.away];
  if (!home || !away) return;
  home.played += 1; away.played += 1;
  if (m.winner === m.home) { home.wins += 1; away.losses += 1; home.points += 2; }
  else if (m.winner === m.away) { away.wins += 1; home.losses += 1; away.points += 2; }
  // NRR rough
  home.nrr += ((m.homeRuns ?? 0) - (m.awayRuns ?? 0)) / 100;
  away.nrr += ((m.awayRuns ?? 0) - (m.homeRuns ?? 0)) / 100;
}

// Advance a single tournament up to currentWeek; populate semi/final teams once group ends
export function advanceTournament(t: Tournament, currentWeek: number): Tournament {
  if (t.finished) return t;
  for (const m of t.matches) {
    if (m.played) continue;
    if (m.week <= currentWeek && m.stage === "Group") {
      const simmed = simMatch(m, t.format);
      Object.assign(m, simmed);
      applyResult(t, m);
    }
  }
  // If all group matches done, slot semi + final teams
  const groupDone = t.matches.filter((m) => m.stage === "Group").every((m) => m.played);
  if (groupDone && t.id !== "WTC") {
    const sorted = Object.values(t.standings).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    const top4 = sorted.slice(0, 4).map((s) => s.nation);
    const semis = t.matches.filter((m) => m.stage === "Semi");
    if (semis[0] && !semis[0].played) {
      semis[0].home = top4[0]; semis[0].away = top4[3];
    }
    if (semis[1] && !semis[1].played) {
      semis[1].home = top4[1]; semis[1].away = top4[2];
    }
    for (const sm of semis) {
      if (!sm.played && sm.week <= currentWeek) {
        const simmed = simMatch(sm, t.format);
        Object.assign(sm, simmed);
      }
    }
    const semisDone = semis.every((m) => m.played);
    const final = t.matches.find((m) => m.stage === "Final");
    if (semisDone && final && !final.played) {
      final.home = semis[0].winner ?? top4[0];
      final.away = semis[1].winner ?? top4[1];
      if (final.week <= currentWeek) {
        const simmed = simMatch(final, t.format);
        Object.assign(final, simmed);
        t.champion = final.winner;
        t.finished = true;
      }
    }
  } else if (t.id === "WTC") {
    const final = t.matches[0];
    if (!final.played && final.week <= currentWeek) {
      const simmed = simMatch(final, t.format);
      Object.assign(final, simmed);
      t.champion = final.winner;
      t.finished = true;
    }
  }
  return t;
}

export function advanceTournaments(state: TournamentsState, currentWeek: number, currentYear: number): TournamentsState {
  const active: Tournament[] = [];
  const history = [...state.history];
  for (const t of state.active) {
    const updated = advanceTournament(t, currentWeek);
    if (updated.finished && updated.year === currentYear) {
      // Move to history
      if (updated.champion) history.push({ id: updated.id, year: updated.year, champion: updated.champion });
    }
    active.push(updated);
  }
  // Drop tournaments from past years that are finished
  const filtered = active.filter((t) => !(t.finished && t.year < currentYear));
  return { active: filtered, history };
}

export function newTournamentsForYear(year: number): Tournament[] {
  return tournamentsForYear(year).map((id) => createTournament(id, year));
}
