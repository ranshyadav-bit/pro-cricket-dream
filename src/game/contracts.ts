// Contract / auction offer generation. Annual offers from franchises + nation boards.

import { overallRating } from "./rating";
import { LEAGUE_BY_ID } from "./rosters";
import type { Player, SaveGame } from "./types";

export type ContractOffer = {
  id: string;
  fromTeam: string;
  league?: "IPL" | "BBL" | "PSL" | "County";
  format: "T20" | "ODI" | "Test" | "Multi";
  tier: Player["tier"];
  basePrice: number; // in $k
  signingBonus: number; // in $k
  durationYears: number;
  reasoning: string;
};

function valueFromRating(rating: number, isFranchise: boolean): { base: number; bonus: number } {
  // Base price scales sharply at the top end (auction-style)
  let base: number;
  if (rating >= 88) base = 1500 + (rating - 88) * 250;
  else if (rating >= 80) base = 600 + (rating - 80) * 110;
  else if (rating >= 72) base = 200 + (rating - 72) * 50;
  else if (rating >= 65) base = 80 + (rating - 65) * 15;
  else base = 30 + Math.max(0, rating - 55) * 5;
  if (!isFranchise) base = Math.round(base * 0.55); // domestic/national contracts pay less than franchise
  // Some randomness
  base = Math.round(base * (0.85 + Math.random() * 0.3));
  const bonus = Math.round(base * (0.1 + Math.random() * 0.15));
  return { base, bonus };
}

// Produce 0-3 offers based on rating, stats, current tier
export function generateAnnualOffers(save: SaveGame): ContractOffer[] {
  const rating = overallRating(save.player);
  const offers: ContractOffer[] = [];

  // IPL/BBL/PSL franchise offers (T20 specialists / high rating)
  if (rating >= 70 && save.stats.matches >= 8) {
    const leagues: Array<"IPL" | "BBL" | "PSL"> = ["IPL", "BBL", "PSL"];
    // Higher rating → more franchise interest
    const interestCount = rating >= 85 ? 3 : rating >= 78 ? 2 : 1;
    const shuffled = [...leagues].sort(() => Math.random() - 0.5);
    for (let i = 0; i < interestCount && i < shuffled.length; i++) {
      const league = shuffled[i];
      const teams = LEAGUE_BY_ID[league];
      const team = teams[Math.floor(Math.random() * teams.length)];
      const { base, bonus } = valueFromRating(rating, true);
      offers.push({
        id: makeId(),
        fromTeam: team.name,
        league,
        format: "T20",
        tier: "Franchise T20",
        basePrice: base,
        signingBonus: bonus,
        durationYears: 1 + Math.floor(Math.random() * 2),
        reasoning: rating >= 88
          ? `Marquee auction pick — ${team.short} sees you as a tournament-defining player.`
          : `${team.short} flagged you in the auction. Solid pick at this price point.`,
      });
    }
  }

  // County championship offer (Test/long-format suited)
  if (rating >= 65 && save.stats.matches >= 5) {
    const counties = LEAGUE_BY_ID.County;
    const team = counties[Math.floor(Math.random() * counties.length)];
    const { base, bonus } = valueFromRating(rating, false);
    offers.push({
      id: makeId(),
      fromTeam: team.name,
      league: "County",
      format: "Multi",
      tier: "Domestic",
      basePrice: Math.round(base * 0.7),
      signingBonus: Math.round(bonus * 0.6),
      durationYears: 1 + Math.floor(Math.random() * 3),
      reasoning: `${team.name} would like you on a Kolpak-style overseas deal — full season commitment.`,
    });
  }

  // National board contract upgrade
  if (rating >= 75 && save.player.tier !== "International") {
    const { base, bonus } = valueFromRating(rating, false);
    offers.push({
      id: makeId(),
      fromTeam: `${save.player.nation} National Selection`,
      format: "Multi",
      tier: "International",
      basePrice: base * 2,
      signingBonus: bonus,
      durationYears: 1,
      reasoning: `Selectors prepared a central contract proposal pending your call-up window.`,
    });
  }

  return offers;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}
