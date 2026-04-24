// Scout system — after a strong individual match, an international or league scout
// may issue an inbox offer. 20% base, scaled by performance grade.

import type { ContractOffer } from "./contracts";
import { LEAGUE_BY_ID } from "./rosters";
import { overallRating } from "./rating";
import type { InboxMessage, Player, SaveGame } from "./types";

export type ScoutGrade = "A" | "B" | "C" | "D";

const SCOUT_APPEARANCE_RATE = 0.2;

export function gradeMatch(perf: { runs: number; balls: number; wickets: number; runsConceded: number; ballsBowled: number; out: boolean }): ScoutGrade {
  let score = 0;
  if (perf.runs >= 100) score += 5;
  else if (perf.runs >= 50) score += 3;
  else if (perf.runs >= 30) score += 1;
  if (perf.wickets >= 5) score += 5;
  else if (perf.wickets >= 3) score += 3;
  else if (perf.wickets >= 2) score += 1;
  if (perf.balls > 10 && perf.runs / Math.max(1, perf.balls) > 1.5) score += 1;
  const econ = perf.ballsBowled > 0 ? (perf.runsConceded / perf.ballsBowled) * 6 : 99;
  if (perf.ballsBowled > 0 && econ < 7) score += 1;
  if (score >= 6) return "A";
  if (score >= 4) return "B";
  if (score >= 2) return "C";
  return "D";
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomFromArr<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaledNationalValue(rating: number, factor: number): { basePrice: number; signingBonus: number } {
  const base = Math.max(120, Math.round((220 + Math.max(0, rating - 60) * 42) * factor));
  return {
    basePrice: base,
    signingBonus: Math.round(base * 0.18),
  };
}

// Build a scout offer based on the player's current state, grade, and a target competition
export function generateScoutOffer(save: SaveGame, grade: ScoutGrade): ContractOffer | null {
  const rating = overallRating(save.player);
  const player = save.player;
  const factor = grade === "A" ? 1.6 : grade === "B" ? 1.2 : grade === "C" ? 0.9 : 0.7;
  const contractSlots = save.contractSlots ?? { franchise: null, nation: null };
  const hasNationSlot = !!contractSlots.nation;
  const hasFranchiseSlot = !!contractSlots.franchise;
  const offers: ContractOffer[] = [];

  if (!hasNationSlot && rating >= 60) {
    const value = scaledNationalValue(rating, factor * 0.8);
    offers.push({
      id: makeId(),
      fromTeam: `${player.nation} A`,
      format: "ODI",
      tier: "National A",
      basePrice: value.basePrice,
      signingBonus: value.signingBonus,
      durationYears: 1,
      reasoning: `${player.nation} A selectors want you on the next A-tour squad.`,
    });
  }

  if (!hasNationSlot && rating >= 76 && grade !== "D") {
    const value = scaledNationalValue(rating, factor);
    offers.push({
      id: makeId(),
      fromTeam: `${player.nation} National Team`,
      format: "T20",
      tier: "International",
      basePrice: value.basePrice,
      signingBonus: value.signingBonus,
      durationYears: 1,
      reasoning: `${player.nation} selectors want you in the T20 World Cup squad pool.`,
    });
  }

  if (!hasNationSlot && rating >= 80 && (grade === "A" || grade === "B" || Math.random() < 0.5)) {
    const value = scaledNationalValue(rating, factor * 1.08);
    offers.push({
      id: makeId(),
      fromTeam: `${player.nation} National Team`,
      format: "ODI",
      tier: "International",
      basePrice: value.basePrice,
      signingBonus: value.signingBonus,
      durationYears: 1,
      reasoning: `${player.nation} selectors have marked you for the ODI Cricket World Cup squad.`,
    });
  }

  if (!hasNationSlot && rating >= 82 && (grade === "A" || grade === "B")) {
    const value = scaledNationalValue(rating, factor * 1.15);
    offers.push({
      id: makeId(),
      fromTeam: `${player.nation} National Team`,
      format: "Test",
      tier: "International",
      basePrice: value.basePrice,
      signingBonus: value.signingBonus,
      durationYears: 2,
      reasoning: `${player.nation} selectors see you as a World Test Championship option.`,
    });
  }

  if (!hasFranchiseSlot && rating >= 70) {
    const leagues: Array<"IPL" | "BBL" | "PSL"> = ["IPL", "BBL", "PSL"];
    for (const league of leagues) {
      const teams = LEAGUE_BY_ID[league];
      const team = randomFromArr(teams);
      let base: number;
      if (rating >= 88) base = 1400 + (rating - 88) * 220;
      else if (rating >= 80) base = 550 + (rating - 80) * 100;
      else if (rating >= 72) base = 180 + (rating - 72) * 45;
      else base = 60 + Math.max(0, rating - 60) * 8;
      base = Math.round(base * factor * (0.85 + Math.random() * 0.3));
      const bonus = Math.round(base * (0.1 + Math.random() * 0.18));
      offers.push({
        id: makeId(),
        fromTeam: team.name,
        league,
        format: "T20",
        tier: "Franchise T20",
        basePrice: base,
        signingBonus: bonus,
        durationYears: 1,
        reasoning: `Scout from ${team.short} watched you live. ${grade === "A" ? "Marquee target." : grade === "B" ? "Strong interest." : "Worth a punt."}`,
      });
    }
  }

  if (rating >= 64) {
    const teams = LEAGUE_BY_ID.County;
    const team = randomFromArr(teams);
    const base = Math.round((120 + Math.max(0, rating - 60) * 22) * factor);
    offers.push({
      id: makeId(),
      fromTeam: team.name,
      league: "County",
      format: "Multi",
      tier: "Domestic",
      basePrice: base,
      signingBonus: Math.round(base * 0.14),
      durationYears: 2,
      reasoning: `${team.name} want to bring you in for a county deal.`,
    });
  }

  if (offers.length === 0) return null;
  return randomFromArr(offers);
}

export function buildScoutInboxMessage(week: number, year: number, offer: ContractOffer): InboxMessage {
  return {
    id: makeId(),
    week, year,
    from: `Scout — ${offer.fromTeam}`,
    subject: `Scout interest · ${offer.fromTeam} · $${(offer.basePrice + offer.signingBonus).toLocaleString()}k`,
    body:
      `${offer.reasoning}\n\n` +
      `${offer.fromTeam} have tabled an offer:\n` +
      `Format: ${offer.format}${offer.league ? " (" + offer.league + ")" : ""}\n` +
      `Base price: $${offer.basePrice.toLocaleString()}k\n` +
      `Signing bonus: $${offer.signingBonus.toLocaleString()}k\n` +
      `Length: ${offer.durationYears} year${offer.durationYears > 1 ? "s" : ""}\n\n` +
      `You can Accept, Decline, or Negotiate (counter ±20% — 60% chance they agree).`,
    read: false,
    type: "scout",
    offer: { ...offer },
  };
}

// Decide whether to fire a scout offer after a match. Returns the message or null.
export function maybeScoutOffer(
  save: SaveGame,
  perf: { runs: number; balls: number; wickets: number; runsConceded: number; ballsBowled: number; out: boolean },
): InboxMessage | null {
  const grade = gradeMatch(perf);
  const offer = generateScoutOffer(save, grade);
  if (!offer) return null;
  if (Math.random() > SCOUT_APPEARANCE_RATE) return null;
  return buildScoutInboxMessage(save.week, save.year, offer);
}

// Negotiate: counter the offer ±20%. 60% chance accepted.
export function negotiateOffer(offer: ContractOffer): { accepted: boolean; counter: ContractOffer } {
  const bump = 1 + (0.10 + Math.random() * 0.10); // +10..20%
  const counter: ContractOffer = {
    ...offer,
    basePrice: Math.round(offer.basePrice * bump),
    signingBonus: Math.round(offer.signingBonus * bump),
  };
  const accepted = Math.random() < 0.60;
  return { accepted, counter };
}

// Captain promotion — fired separately after sustained good form
export function maybeCaptainPromotion(save: SaveGame): InboxMessage | null {
  if (save.player.retired) return null;
  if (save.player.perks.includes("Captain")) return null;
  // Need: at least 6 matches in the season, avg >= 35 OR avg wickets per match >= 2
  if (save.seasonStats.matches < 6) return null;
  const outs = Math.max(1, save.seasonStats.innings - save.seasonStats.notOuts);
  const avg = save.seasonStats.runs / outs;
  const wpm = save.seasonStats.wickets / Math.max(1, save.seasonStats.matches);
  const goodBatter = avg >= 35;
  const goodBowler = wpm >= 1.8;
  if (!goodBatter && !goodBowler) return null;
  if (Math.random() > 0.25) return null; // 25% chance per qualifying week
  return {
    id: makeId(),
    week: save.week, year: save.year,
    from: `${save.player.team} — Director of Cricket`,
    subject: `You are the new captain of ${save.player.team}`,
    body:
      `${save.player.name},\n\n` +
      `Your form and leadership have impressed us. The board has decided to appoint you as captain of ${save.player.team} for the season ahead.\n\n` +
      `It's a privilege and a responsibility — set the tone, back your players, and chase the title.\n\n` +
      `Welcome to the captain's chair.`,
    read: false,
    type: "milestone",
  };
}

// Helpers used by inbox UI to determine if an offer is allowed under "1 franchise + 1 nation" rule
export function offerSlotConflict(save: SaveGame, offer: { league?: "IPL" | "BBL" | "PSL" | "County"; tier: Player["tier"] }): string | null {
  const cs = save.contractSlots ?? { franchise: null, nation: null };
  const isFranchise = !!offer.league && offer.league !== "County";
  const isNation = offer.tier === "International" || offer.tier === "National A";
  if (isFranchise && cs.franchise) {
    return `You're already contracted to ${cs.franchise.team} (${cs.franchise.league}). Decline or wait for it to expire.`;
  }
  if (isNation && cs.nation) {
    return `You're already on a national contract with ${cs.nation.team}.`;
  }
  return null;
}
