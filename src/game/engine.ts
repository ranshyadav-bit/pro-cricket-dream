// Ball-by-ball resolver. The player picks a shot (or the bowler picks line+length),
// the engine resolves with deterministic-ish RNG modulated by skills + confidence.

import type {
  BallOutcome,
  DeliveryType,
  LengthPos,
  LinePos,
  Player,
  ShotType,
} from "./types";
import { clamp } from "./rating";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// AI bowler picks a delivery for a given ball
export function aiBowlerDelivery(
  bowlerSkill: number,
  format: "T20" | "ODI" | "Test" | "Club",
  ballInOver: number,
): { line: LinePos; length: LengthPos; delivery: DeliveryType } {
  const lines: LinePos[] = ["Off", "Stump", "Stump", "Off", "Wide", "Leg"];
  const lengths: LengthPos[] = ["Good", "Good", "Good", "Full", "Short", "Yorker"];
  let delivery: DeliveryType = "Stock";
  // Late overs in T20 → more variations
  if (format === "T20" && ballInOver >= 4 && Math.random() < 0.4) {
    delivery = pick(["Yorker", "Slower", "Bouncer"] as DeliveryType[]);
  } else if (Math.random() < 0.2 && bowlerSkill > 60) {
    delivery = pick(["Outswinger", "Inswinger"] as DeliveryType[]);
  }
  return { line: pick(lines), length: pick(lengths), delivery };
}

interface ShotProfile {
  // Risk = chance of dismissal; reward = max runs; aggro = strike-rate boost
  baseRuns: number[]; // possible run outcomes
  weights: number[]; // matching weights (must sum to anything; engine normalizes)
  dotChance: number; // 0–1 baseline dot chance
  wicketBase: number; // 0–1 baseline wicket chance per ball
  boundaryBoost: boolean;
}

const SHOT_PROFILES: Record<ShotType, ShotProfile> = {
  Leave: { baseRuns: [0], weights: [1], dotChance: 0.95, wicketBase: 0.005, boundaryBoost: false },
  Defend: { baseRuns: [0, 1], weights: [85, 15], dotChance: 0.85, wicketBase: 0.01, boundaryBoost: false },
  Block: { baseRuns: [0], weights: [1], dotChance: 0.97, wicketBase: 0.005, boundaryBoost: false },
  "Push for 1": { baseRuns: [0, 1, 2], weights: [40, 50, 10], dotChance: 0.4, wicketBase: 0.02, boundaryBoost: false },
  Drive: { baseRuns: [0, 1, 2, 3, 4], weights: [25, 30, 20, 5, 20], dotChance: 0.25, wicketBase: 0.05, boundaryBoost: true },
  Cut: { baseRuns: [0, 1, 2, 4], weights: [30, 25, 20, 25], dotChance: 0.3, wicketBase: 0.05, boundaryBoost: true },
  Pull: { baseRuns: [0, 1, 2, 4, 6], weights: [25, 20, 15, 25, 15], dotChance: 0.25, wicketBase: 0.07, boundaryBoost: true },
  Sweep: { baseRuns: [0, 1, 2, 4], weights: [30, 30, 15, 25], dotChance: 0.3, wicketBase: 0.06, boundaryBoost: true },
  Loft: { baseRuns: [0, 1, 2, 4, 6], weights: [25, 15, 10, 25, 25], dotChance: 0.25, wicketBase: 0.13, boundaryBoost: true },
  Slog: { baseRuns: [0, 1, 4, 6], weights: [35, 10, 20, 35], dotChance: 0.35, wicketBase: 0.22, boundaryBoost: true },
};

// Synergy: which shot fits which length
const SHOT_LENGTH_BONUS: Partial<Record<ShotType, Partial<Record<LengthPos, number>>>> = {
  Drive: { Full: 0.3, Yorker: -0.4, Short: -0.3 },
  Cut: { Short: 0.3, Good: 0.1, Full: -0.2, Yorker: -0.4 },
  Pull: { Short: 0.4, Good: 0.0, Full: -0.3, Yorker: -0.5 },
  Sweep: { Full: 0.2, Good: 0.2, Short: -0.2 },
  Loft: { Full: 0.3, Good: 0.1, Short: 0.0, Yorker: -0.5 },
  Slog: { Full: 0.2, Short: 0.1, Yorker: -0.4 },
  Defend: { Yorker: 0.3, Good: 0.2 },
  Leave: { Wide: 0.5, Short: 0.2 } as Partial<Record<LengthPos, number>>,
  Block: { Yorker: 0.4, Good: 0.2, Full: 0.1 },
};

function weighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export interface ResolveBattingArgs {
  player: Player;
  shot: ShotType;
  delivery: DeliveryType;
  line: LinePos;
  length: LengthPos;
  bowlerRating: number;
  pressure: number; // 0..1, e.g. balls remaining / required RR
}

export function resolveBatting(args: ResolveBattingArgs): BallOutcome {
  const { player, shot, delivery, line, length, bowlerRating, pressure } = args;
  const s = player.skills;
  const profile = SHOT_PROFILES[shot];

  // Skill modifier — higher skill = lower wicket risk + more boundaries
  const battingScore = (s.timing + s.technique + s.power + s.patience + s.composure) / 5; // ~30..90
  const skillRatio = (battingScore - bowlerRating + 50) / 100; // ~0..1
  const conf = player.confidence / 100;

  // Length synergy
  const lengthBonus = SHOT_LENGTH_BONUS[shot]?.[length] ?? 0;

  // Wicket chance
  let wicketChance = profile.wicketBase;
  // Bowler delivery threats vs shot
  if (delivery === "Yorker" && (shot === "Drive" || shot === "Slog" || shot === "Loft")) wicketChance += 0.06;
  if (delivery === "Bouncer" && (shot === "Pull" || shot === "Slog")) wicketChance += 0.04;
  if ((delivery === "Outswinger" || delivery === "Inswinger") && shot === "Drive") wicketChance += 0.04;
  // Skill reduces wicket chance
  wicketChance *= clamp(1.2 - skillRatio - conf * 0.2, 0.25, 1.6);
  // Pressure raises risk slightly
  wicketChance *= 1 + pressure * 0.15;
  // Length mismatch adds risk
  if (lengthBonus < 0) wicketChance *= 1 + Math.abs(lengthBonus);

  // Wide / no-ball check — only on Wide line and if bowler is unpressured-skill
  if (line === "Wide" && shot === "Leave") {
    if (Math.random() < 0.55 - skillRatio * 0.2) {
      return {
        runs: 1,
        isWicket: false,
        isBoundary: false,
        isExtra: true,
        extraType: "Wide",
        commentary: `Down the leg / wide of off — called wide. 1 extra.`,
        shot,
        delivery,
      };
    }
  }

  if (Math.random() < wicketChance) {
    // Wicket
    const wicketType = pickWicketType(shot, delivery, length);
    return {
      runs: 0,
      isWicket: true,
      wicketType,
      isBoundary: false,
      isExtra: false,
      shot,
      delivery,
      commentary: wicketCommentary(player.name, wicketType, shot, delivery),
    };
  }

  // Non-wicket: pick run outcome from shot profile, biased by skill + length synergy
  const adjustedWeights = profile.baseRuns.map((r, i) => {
    let w = profile.weights[i];
    if (r >= 4) w *= 1 + skillRatio * 0.6 + lengthBonus + conf * 0.3;
    if (r === 0) w *= 1 + (1 - skillRatio) * 0.4 - lengthBonus * 0.3;
    if (r === 6) w *= 1 + (s.power - 50) / 80;
    return Math.max(0.5, w);
  });
  const runs = weighted(profile.baseRuns, adjustedWeights);
  return {
    runs,
    isWicket: false,
    isBoundary: runs === 4 || runs === 6,
    isExtra: false,
    shot,
    delivery,
    commentary: runCommentary(player.name, runs, shot, delivery),
  };
}

function pickWicketType(shot: ShotType, delivery: DeliveryType, length: LengthPos): NonNullable<BallOutcome["wicketType"]> {
  if (delivery === "Yorker") return "Bowled";
  if (length === "Full" && (shot === "Defend" || shot === "Drive")) return Math.random() < 0.5 ? "LBW" : "Bowled";
  if (shot === "Loft" || shot === "Slog" || shot === "Pull") return "Caught";
  if (shot === "Sweep") return Math.random() < 0.4 ? "LBW" : "Caught";
  return Math.random() < 0.5 ? "Caught" : "Bowled";
}

function wicketCommentary(name: string, wt: NonNullable<BallOutcome["wicketType"]>, shot: ShotType, d: DeliveryType): string {
  switch (wt) {
    case "Bowled":
      return `OH! ${d} crashes into the stumps! ${name} tried to ${shot.toLowerCase()} — gone!`;
    case "LBW":
      return `Big appeal... GIVEN! ${name} is plumb in front. Trapped LBW.`;
    case "Caught":
      return `Up in the air... and TAKEN! ${name} departs, caught off the ${shot.toLowerCase()}.`;
    case "Stumped":
      return `Beaten and stumped! ${name} dragged out of the crease.`;
    case "Run Out":
      return `Calamity in the middle — ${name} run out!`;
  }
}

function runCommentary(name: string, runs: number, shot: ShotType, d: DeliveryType): string {
  if (runs === 0) {
    if (shot === "Leave") return `${name} shoulders arms — let it go.`;
    if (shot === "Block" || shot === "Defend") return `Solid defence from ${name}, dot ball.`;
    return `${name} swings and misses — dot ball.`;
  }
  if (runs === 4) return `FOUR! Beautifully timed ${shot.toLowerCase()} from ${name} — races to the rope.`;
  if (runs === 6) return `MAXIMUM! ${name} launches it over the ropes off the ${d.toLowerCase()}!`;
  if (runs === 1) return `Pushed for a single, ${name} keeps the strike rotating.`;
  return `${runs} runs — well placed by ${name}.`;
}

// --- Bowling resolution: AI batter responds to player's chosen line/length/delivery ---

export interface ResolveBowlingArgs {
  player: Player; // the bowler (the user)
  delivery: DeliveryType;
  line: LinePos;
  length: LengthPos;
  batterRating: number; // AI batter overall
  pressure: number;
}

export function resolveBowling(args: ResolveBowlingArgs): BallOutcome {
  const { player, delivery, line, length, batterRating, pressure } = args;
  const s = player.skills;
  const bowlScore = (s.pace + s.accuracy + s.movement + s.variation + s.composure) / 5;
  const skillRatio = (bowlScore - batterRating + 50) / 100;
  const conf = player.confidence / 100;

  // Wide / no-ball if low accuracy
  const wideChance = clamp(0.04 + (50 - s.accuracy) / 400 + (line === "Wide" ? 0.15 : 0), 0.02, 0.3);
  if (Math.random() < wideChance) {
    return {
      runs: 1, isWicket: false, isBoundary: false, isExtra: true, extraType: "Wide",
      commentary: `Wide called — ${player.name} drifts it down leg.`,
      delivery,
    };
  }

  // Wicket chance based on combo
  let wicketChance = 0.04 + skillRatio * 0.06 + conf * 0.02;
  if (delivery === "Yorker" && length === "Yorker") wicketChance += 0.10;
  if (delivery === "Bouncer" && length === "Short") wicketChance += 0.05;
  if (delivery === "Outswinger" && length === "Good" && line === "Off") wicketChance += 0.06;
  if (delivery === "Inswinger" && length === "Full" && line === "Stump") wicketChance += 0.06;
  if ((delivery === "Off-Break" || delivery === "Leg-Break" || delivery === "Doosra") && length === "Good") wicketChance += 0.04;
  // Pressure on batter increases wicket chance
  wicketChance *= 1 + pressure * 0.2;
  wicketChance = clamp(wicketChance, 0.005, 0.5);

  if (Math.random() < wicketChance) {
    const wt: NonNullable<BallOutcome["wicketType"]> = delivery === "Yorker" ? "Bowled"
      : delivery === "Bouncer" ? "Caught"
      : (Math.random() < 0.5 ? "Caught" : (Math.random() < 0.5 ? "LBW" : "Bowled"));
    return {
      runs: 0, isWicket: true, wicketType: wt, isBoundary: false, isExtra: false,
      delivery,
      commentary: `WICKET! ${player.name} strikes — ${wt.toLowerCase()}!`,
    };
  }

  // Run outcome — short-and-wide gets punished
  const runs: number[] = [0, 1, 2, 3, 4, 6];
  let weights = [40, 30, 10, 2, 12, 6];
  if (length === "Short" && (line === "Off" || line === "Wide")) weights = [25, 25, 10, 2, 25, 13];
  if (length === "Yorker") weights = [55, 30, 5, 1, 7, 2];
  if (length === "Full" && line === "Stump") weights = [45, 30, 10, 2, 10, 3];
  // Skilled bowlers concede less
  weights = weights.map((w, i) => {
    if (runs[i] >= 4) return w * clamp(1 - skillRatio * 0.5, 0.3, 1.5);
    if (runs[i] === 0) return w * (1 + skillRatio * 0.3);
    return w;
  });
  const r = weighted(runs, weights);
  return {
    runs: r,
    isWicket: false,
    isBoundary: r === 4 || r === 6,
    isExtra: false,
    delivery,
    commentary:
      r === 0 ? `Dot ball — ${player.name} squeezes it in.`
        : r === 4 ? `FOUR conceded — driven away!`
        : r === 6 ? `SIX! That's gone all the way!`
        : `${r} run${r > 1 ? "s" : ""} taken.`,
  };
}

// Helper: turn a fixture format into overs
export function oversForFormat(format: "T20" | "ODI" | "Test" | "Club"): number {
  switch (format) {
    case "T20": return 20;
    case "ODI": return 50;
    case "Test": return 90; // single-day cap for sim
    case "Club": return 30;
  }
}
