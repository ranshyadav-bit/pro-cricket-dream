// Scout system — after a strong individual match, an international or league scout
// may issue an inbox offer. 20% base, scaled by performance grade.

import type { ContractOffer } from "./contracts";
import { LEAGUE_BY_ID } from "./rosters";
import { overallRating } from "./rating";
import type { InboxMessage, Player, SaveGame } from "./types";

export type ScoutGrade = "A" | "B" | "C" | "D";

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

function scoutChance(grade: ScoutGrade, rating: number): number {
  // Higher grade + higher rating = better odds. Base 20% as user specified.
  let p = 0.05;
  if (grade === "D") p = 0.05;
  if (grade === "C") p = 0.18;
  if (grade === "B") p = 0.32;
  if (grade === "A") p = 0.55;
  // Rating scales it slightly
  p *= 0.7 + Math.min(1.0, (rating - 55) / 50);
  return Math.min(0.85, Math.max(0.02, p));
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomFromArr<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build a scout offer based on the player's current state, grade, and a target competition
export function generateScoutOffer(save: SaveGame, grade: ScoutGrade): ContractOffer | null {
  const rating = overallRating(save.player);
  const player = save.player;

  // Pick scout type based on rating + current tier
  // Above 78 → international scout from own nation (if not already national)
  // Above 70 → league scout
  // Else → domestic / no offer
  const hasNational = save.contractValue !== undefined && save.player.tier === "International"; // simplified
  const offers: Array<"International" | "IPL" | "BBL" | "PSL" | "County"> = [];
  if (rating >= 78 && !hasNational) offers.push("International");
  if (rating >= 70) offers.push("IPL", "BBL", "PSL");
  if (rating >= 62) offers.push("County");
  if (offers.length === 0) return null;

  const choice = randomFromArr(offers);
  const factor = grade === "A" ? 1.6 : grade === "B" ? 1.2 : grade === "C" ? 0.9 : 0.7;

  if (choice === "International") {
    const base = Math.round((400 + (rating - 75) * 50) * factor);
    return {
      id: makeId(),
      fromTeam: `${player.nation} National Selectors`,
      format: "Multi",
      tier: "International",
      basePrice: base,
      signingBonus: Math.round(base * 0.2),
      durationYears: 2,
      reasoning: `A national selector watched your last outing and wants you in the squad.`,
    };
  }

  // League scout
  const teams = LEAGUE_BY_ID[choice];
  const team = randomFromArr(teams);
  let base: number;
  if (rating >= 88) base = 1400 + (rating - 88) * 220;
  else if (rating >= 80) base = 550 + (rating - 80) * 100;
  else if (rating >= 72) base = 180 + (rating - 72) * 45;
  else base = 60 + Math.max(0, rating - 60) * 8;
  base = Math.round(base * factor * (0.85 + Math.random() * 0.3));
  const bonus = Math.round(base * (0.1 + Math.random() * 0.18));
  return {
    id: makeId(),
    fromTeam: team.name,
    league: choice,
    format: choice === "County" ? "Multi" : "T20",
    tier: choice === "County" ? "Domestic" : "Franchise T20",
    basePrice: base,
    signingBonus: bonus,
    durationYears: choice === "County" ? 2 : 1,
    reasoning: `Scout from ${team.short} watched you live. ${grade === "A" ? "Marquee target." : grade === "B" ? "Strong interest." : "Worth a punt."}`,
  };
}

export function buildScoutInboxMessage(week: number, year: number, offer: ContractOffer): InboxMessage {
  return {
    id: makeId(),
    week, year,
    from: `Scout — ${offer.fromTeam}`,
    subject: `Scout interest · ${offer.league ?? offer.format} · $${(offer.basePrice + offer.signingBonus).toLocaleString()}k`,
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
  const rating = overallRating(save.player);
  const chance = scoutChance(grade, rating);
  if (Math.random() > chance) return null;
  const offer = generateScoutOffer(save, grade);
  if (!offer) return null;
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
  const isNation = offer.tier === "International";
  if (isFranchise && cs.franchise) {
    return `You're already contracted to ${cs.franchise.team} (${cs.franchise.league}). Decline or wait for it to expire.`;
  }
  if (isNation && cs.nation) {
    return `You're already on a national contract with ${cs.nation.team}.`;
  }
  return null;
}
