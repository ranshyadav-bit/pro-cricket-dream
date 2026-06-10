// Scout system — after a strong individual match, an international or league scout
// may issue an inbox offer. Probability is performance-driven (see scoutChance).

import type { ContractOffer } from "./contracts";
import { LEAGUE_BY_ID } from "./rosters";
import { overallRating } from "./rating";
import { normalizeSlots, type InboxMessage, type Player, type SaveGame } from "./types";

export type ScoutGrade = "A" | "B" | "C" | "D";

// Performance-driven scout appearance chance.
// Batting: duck=0, ≤10=5%, 50=25%, 100=55%, 200+=100% (linear between checkpoints).
// Bowling: wicketless=0, 1w=5%, 2w=15%, 3w=35%, 4w=60%, 5w+=100%.
// The higher of the two chances wins.
export function scoutChance(perf: { runs: number; balls: number; wickets: number; runsConceded: number; ballsBowled: number; out: boolean }): number {
  let batP = 0;
  const batted = perf.balls > 0 || perf.out || perf.runs > 0;
  if (batted) {
    const r = perf.runs;
    if (r >= 200) batP = 1;
    else if (r >= 100) batP = 0.55 + ((r - 100) / 100) * 0.45;
    else if (r >= 50) batP = 0.25 + ((r - 50) / 50) * 0.30;
    else if (r > 10) batP = 0.05 + ((r - 10) / 40) * 0.20;
    else if (r > 0) batP = 0.05 * (r / 10);
  }
  let bowlP = 0;
  if (perf.ballsBowled > 0) {
    if (perf.wickets >= 5) bowlP = 1;
    else if (perf.wickets === 4) bowlP = 0.60;
    else if (perf.wickets === 3) bowlP = 0.35;
    else if (perf.wickets === 2) bowlP = 0.15;
    else if (perf.wickets === 1) bowlP = 0.05;
    else bowlP = 0;
  }
  return Math.max(batP, bowlP);
}


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
  const slots = normalizeSlots(save.contractSlots);
  const hasNationSlot = !!slots.nation;
  const hasNationASlot = !!slots.nationA;
  const signedLeagues = new Set(slots.franchises.map((f) => f.league));
  const offers: ContractOffer[] = [];

  if (!hasNationASlot) {
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

  if (!hasNationSlot && rating >= 68 && grade !== "D") {
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

  if (!hasNationSlot && rating >= 72 && (grade === "A" || grade === "B" || Math.random() < 0.5)) {
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

  if (!hasNationSlot && rating >= 74 && (grade === "A" || grade === "B")) {
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

  if (rating >= 62 || grade === "A" || grade === "B") {
    const allLeagues: Array<"IPL" | "BBL" | "PSL"> = ["IPL", "BBL", "PSL"];
    const availableLeagues = allLeagues.filter((l) => !signedLeagues.has(l));
    for (const league of availableLeagues) {
      const teams = LEAGUE_BY_ID[league];
      const team = randomFromArr(teams);
      let base: number;
      if (rating >= 88) base = 1400 + (rating - 88) * 220;
      else if (rating >= 80) base = 550 + (rating - 80) * 100;
      else if (rating >= 72) base = 180 + (rating - 72) * 45;
      else base = 60 + Math.max(0, rating - 55) * 8;
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

  {
    const teams = LEAGUE_BY_ID.County;
    const team = randomFromArr(teams);
    const base = Math.round((100 + Math.max(0, rating - 50) * 22) * factor);
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
  const chance = scoutChance(perf);
  if (chance <= 0) return null;
  if (Math.random() > chance) return null;
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

// Multi-slot rules: one contract per franchise league, one national team, one National A.
// You CAN hold an IPL + a BBL + a PSL + a County + a national + a National A side-by-side.
export function offerSlotConflict(save: SaveGame, offer: { league?: "IPL" | "BBL" | "PSL" | "County"; tier: Player["tier"]; fromTeam?: string }): string | null {
  const slots = normalizeSlots(save.contractSlots);
  const isFranchise = !!offer.league;
  const isNationalA = offer.tier === "National A";
  const isInternational = offer.tier === "International";
  if (isFranchise && offer.league) {
    const existing = slots.franchises.find((f) => f.league === offer.league);
    if (existing) return `You're already contracted to ${existing.team} in the ${offer.league}. Decline or wait for it to expire.`;
  }
  if (isInternational && slots.nation) {
    return `You're already on a national contract with ${slots.nation.team}.`;
  }
  if (isNationalA && slots.nationA) {
    return `You're already on a National A contract with ${slots.nationA.team}.`;
  }
  return null;
}
