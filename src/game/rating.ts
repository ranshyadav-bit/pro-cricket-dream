import type { Player, Skills } from "./types";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function overallRating(p: Player): number {
  const s = p.skills;
  // Role-weighted overall
  const isBatter = ["Top-Order Bat", "Middle-Order Bat", "Finisher", "Wicket-Keeper Bat"].includes(p.role);
  const isAllRounder = p.role === "All-Rounder";
  const battingAvg = (s.timing + s.technique + s.power + s.patience) / 4;
  const bowlingAvg = (s.pace + s.accuracy + s.movement + s.variation) / 4;
  const mental = (s.fitness + s.composure) / 2;
  if (isAllRounder) {
    return Math.round(0.4 * battingAvg + 0.4 * bowlingAvg + 0.2 * mental);
  }
  if (isBatter) {
    return Math.round(0.7 * battingAvg + 0.1 * bowlingAvg + 0.2 * mental);
  }
  return Math.round(0.1 * battingAvg + 0.7 * bowlingAvg + 0.2 * mental);
}

export function battingRating(p: Player): number {
  const s = p.skills;
  return Math.round((s.timing + s.technique + s.power + s.patience + s.composure) / 5);
}

export function bowlingRating(p: Player): number {
  const s = p.skills;
  return Math.round((s.pace + s.accuracy + s.movement + s.variation + s.composure) / 5);
}

export function trainSkill(skills: Skills, key: keyof Skills, xp: number, potential: number): Skills {
  const next = { ...skills };
  // Diminishing returns near potential
  const current = next[key];
  const cap = Math.min(99, potential + 2);
  if (current >= cap) return next;
  const headroom = cap - current;
  const gain = xp * (headroom / cap);
  next[key] = clamp(Math.round((current + gain) * 10) / 10, 1, cap);
  return next;
}
