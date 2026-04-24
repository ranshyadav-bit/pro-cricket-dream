// Smarter opponent picker — when player is in a league/nation, schedule against
// other teams from that competition (NOT their own). For club tier, generic opponents.

import type { Nation, Player } from "./types";
import { LEAGUE_BY_ID, type LeagueId } from "./rosters";

const OTHER_NATIONS: Record<Nation, Nation[]> = (() => {
  const all: Nation[] = ["India","Australia","England","Pakistan","South Africa","New Zealand","West Indies","Sri Lanka","Bangladesh"];
  const out = {} as Record<Nation, Nation[]>;
  for (const n of all) out[n] = all.filter((x) => x !== n);
  return out;
})();

export const OPPONENTS_BY_NATION = OTHER_NATIONS;

export function findLeagueForTeam(teamName: string): LeagueId | null {
  for (const lid of Object.keys(LEAGUE_BY_ID) as LeagueId[]) {
    if (LEAGUE_BY_ID[lid].some((t) => t.name === teamName)) return lid;
  }
  return null;
}

// Pick a league opponent (any team in the same league, not the player's team)
export function pickLeagueOpponent(playerTeam: string, league: LeagueId): string {
  const teams = LEAGUE_BY_ID[league].filter((t) => t.name !== playerTeam);
  return teams[Math.floor(Math.random() * teams.length)].name;
}

// Pick an international opponent (different nation)
export function pickInternationalOpponent(player: Player): string {
  const others = OTHER_NATIONS[player.nation];
  const opp = others[Math.floor(Math.random() * others.length)];
  return `${opp} National Team`;
}

export function pickNationalAOpponent(player: Player): string {
  const others = OTHER_NATIONS[player.nation];
  const opp = others[Math.floor(Math.random() * others.length)];
  return `${opp} A`;
}

// Pick a generic club opponent (used at Club tier)
const GENERIC_CLUBS = [
  "Northern Stars CC", "Southern Lions CC", "Eastern Tigers CC", "Western Eagles CC",
  "Coastal Sharks CC", "Capital Royals CC", "Highland Hawks CC", "Valley Knights CC",
];

export function pickClubOpponent(): string {
  return GENERIC_CLUBS[Math.floor(Math.random() * GENERIC_CLUBS.length)];
}
