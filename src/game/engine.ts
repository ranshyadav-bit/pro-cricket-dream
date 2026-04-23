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

// Shot risk tiers — user spec:
//   GREEN  (Leave / Block / Defend)        → 0% wicket
//   ORANGE (Push for 1 / Drive / Cut / Sweep) → 5–10% wicket
//   RED    (Pull / Loft / Slog)            → ~12% wicket
type ShotTier = "green" | "orange" | "red";
const SHOT_TIER: Record<ShotType, ShotTier> = {
  Leave: "green", Block: "green", Defend: "green",
  "Push for 1": "orange", Drive: "orange", Cut: "orange", Sweep: "orange",
  Pull: "red", Loft: "red", Slog: "red",
};

// AI bowler picks a delivery for a given ball
export function aiBowlerDelivery(
  bowlerSkill: number,
  format: "T20" | "ODI" | "Test" | "Club",
  ballInOver: number,
): { line: LinePos; length: LengthPos; delivery: DeliveryType } {
  const lines: LinePos[] = ["Off", "Stump", "Stump", "Off", "Wide", "Leg"];
  const lengths: LengthPos[] = ["Good", "Good", "Good", "Full", "Short", "Yorker"];
  let delivery: DeliveryType = "Stock";
  if (format === "T20" && ballInOver >= 4 && Math.random() < 0.4) {
    delivery = pick(["Yorker", "Slower", "Bouncer"] as DeliveryType[]);
  } else if (Math.random() < 0.2 && bowlerSkill > 60) {
    delivery = pick(["Outswinger", "Inswinger"] as DeliveryType[]);
  }
  return { line: pick(lines), length: pick(lengths), delivery };
}

// Match situation context for shot resolution
export interface MatchContext {
  format: "T20" | "ODI" | "Test" | "Club";
  // For T20/ODI/Club: balls remaining in the innings
  ballsRemaining?: number;
  // Runs needed to win (chase). undefined = batting first / no chase
  runsNeeded?: number;
}

interface ShotProfile {
  baseRuns: number[];
  weights: number[];
  boundaryBoost: boolean;
}

// Run profiles (no wickets here — wickets are computed by tier rules below)
const SHOT_PROFILES: Record<ShotType, ShotProfile> = {
  Leave:        { baseRuns: [0],             weights: [1],                       boundaryBoost: false },
  Defend:       { baseRuns: [0, 1],          weights: [85, 15],                  boundaryBoost: false },
  Block:        { baseRuns: [0],             weights: [1],                       boundaryBoost: false },
  "Push for 1": { baseRuns: [0, 1, 2],       weights: [35, 55, 10],              boundaryBoost: false },
  Drive:        { baseRuns: [0, 1, 2, 3, 4], weights: [22, 28, 18, 4, 28],       boundaryBoost: true },
  Cut:          { baseRuns: [0, 1, 2, 4],    weights: [25, 25, 18, 32],          boundaryBoost: true },
  Sweep:        { baseRuns: [0, 1, 2, 4],    weights: [25, 28, 15, 32],          boundaryBoost: true },
  Pull:         { baseRuns: [0, 1, 2, 4, 6], weights: [22, 18, 13, 27, 20],      boundaryBoost: true },
  Loft:         { baseRuns: [0, 1, 2, 4, 6], weights: [20, 13, 8, 27, 32],       boundaryBoost: true },
  Slog:         { baseRuns: [0, 1, 4, 6],    weights: [28, 9, 22, 41],           boundaryBoost: true },
};

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

// Format-tuned aggression: how much to bias toward boundaries by default
function formatBoundaryBias(ctx: MatchContext): number {
  switch (ctx.format) {
    case "T20": return 1.0;   // full attack
    case "ODI": return 0.65;
    case "Test": return 0.18; // boundary roughly every ~5 overs
    case "Club": return 0.5;
  }
}

// Death-overs / chase pressure → boost boundaries a lot
function chaseAggression(ctx: MatchContext): number {
  if (!ctx.runsNeeded || !ctx.ballsRemaining || ctx.ballsRemaining <= 0) return 0;
  const required = ctx.runsNeeded / Math.max(1, ctx.ballsRemaining); // runs per ball needed
  // 30 off 10 = 3 rpb → very high. Normal chase ~1 rpb.
  if (required >= 2.0) return 1.4;
  if (required >= 1.4) return 0.9;
  if (required >= 1.0) return 0.5;
  return 0.1;
}

export interface ResolveBattingArgs {
  player: Player;
  shot: ShotType;
  delivery: DeliveryType;
  line: LinePos;
  length: LengthPos;
  bowlerRating: number;
  pressure: number; // legacy 0..1 (kept for compat)
  ctx?: MatchContext;
}

export function resolveBatting(args: ResolveBattingArgs): BallOutcome {
  const { player, shot, delivery, line, length, bowlerRating } = args;
  const ctx: MatchContext = args.ctx ?? { format: "T20" };
  const s = player.skills;
  const profile = SHOT_PROFILES[shot];
  const tier = SHOT_TIER[shot];

  const battingScore = (s.timing + s.technique + s.power + s.patience + s.composure) / 5;
  const skillRatio = (battingScore - bowlerRating + 50) / 100; // ~0..1
  const conf = player.confidence / 100;
  const lengthBonus = SHOT_LENGTH_BONUS[shot]?.[length] ?? 0;

  // ------- Fitness penalty -------
  const fit = player.fitness;
  // <50 = play badly. <30 = nearly cannot score and very wicket-prone.
  const fitMult = fit < 30 ? 0.4 : fit < 50 ? 0.7 : 1.0;
  const fitWicketBoost = fit < 30 ? 1.8 : fit < 50 ? 1.3 : 1.0;

  // ------- Wide call (line=Wide + Leave) -------
  if (line === "Wide" && shot === "Leave") {
    if (Math.random() < 0.55 - skillRatio * 0.2) {
      return {
        runs: 1, isWicket: false, isBoundary: false, isExtra: true, extraType: "Wide",
        commentary: `Down the leg / wide of off — called wide. 1 extra.`,
        shot, delivery,
      };
    }
  }

  // ------- Wicket chance by tier -------
  let wicketChance = 0;
  if (tier === "green") {
    wicketChance = 0; // user spec: 0% from green shots
  } else if (tier === "orange") {
    // 5–10% base, modulated by skill (high skill → ~5%, low skill → ~10%)
    const base = 0.10 - skillRatio * 0.05;
    wicketChance = clamp(base, 0.05, 0.10);
    // Bad length match adds a small bump but stays in band-ish
    if (lengthBonus < 0) wicketChance += 0.02;
  } else {
    // Red: ~12% base
    wicketChance = 0.12;
    if (delivery === "Yorker" && (shot === "Loft" || shot === "Slog")) wicketChance += 0.04;
    if (delivery === "Bouncer" && (shot === "Pull" || shot === "Slog")) wicketChance += 0.03;
    if (lengthBonus > 0) wicketChance -= 0.02;
  }
  // Confidence trims a touch off red/orange risk
  if (tier !== "green") wicketChance *= 1 - conf * 0.10;
  // Fitness-driven wicket boost
  wicketChance *= fitWicketBoost;
  wicketChance = clamp(wicketChance, 0, 0.45);

  if (Math.random() < wicketChance) {
    const wicketType = pickWicketType(shot, delivery, length);
    return {
      runs: 0, isWicket: true, wicketType,
      isBoundary: false, isExtra: false, shot, delivery,
      commentary: wicketCommentary(player.name, wicketType, shot, delivery),
    };
  }

  // ------- Run resolution -------
  const fmtBias = formatBoundaryBias(ctx);
  const chaseBias = chaseAggression(ctx);

  const adjustedWeights = profile.baseRuns.map((r, i) => {
    let w = profile.weights[i];
    if (r >= 4) w *= (1 + skillRatio * 0.5 + lengthBonus + conf * 0.25) * (0.6 + fmtBias + chaseBias);
    if (r === 0) w *= 1 + (1 - skillRatio) * 0.4 - lengthBonus * 0.3;
    if (r === 6) w *= 1 + (s.power - 50) / 70 + chaseBias * 0.6;
    // Fitness mult: low fitness scales runs down
    if (r > 0) w *= fitMult;
    return Math.max(0.4, w);
  });
  const runs = weighted(profile.baseRuns, adjustedWeights);
  return {
    runs, isWicket: false,
    isBoundary: runs === 4 || runs === 6,
    isExtra: false, shot, delivery,
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
  player: Player;
  delivery: DeliveryType;
  line: LinePos;
  length: LengthPos;
  batterRating: number;
  pressure: number;
  ctx?: MatchContext;
}

export function resolveBowling(args: ResolveBowlingArgs): BallOutcome {
  const { player, delivery, line, length, batterRating, pressure } = args;
  const s = player.skills;
  const bowlScore = (s.pace + s.accuracy + s.movement + s.variation + s.composure) / 5;
  const skillRatio = (bowlScore - batterRating + 50) / 100;
  const conf = player.confidence / 100;

  // Fitness penalty for bowler
  const fit = player.fitness;
  const fitWicketMult = fit < 30 ? 0.35 : fit < 50 ? 0.65 : 1.0;
  const fitEconBoost   = fit < 30 ? 1.6  : fit < 50 ? 1.25 : 1.0;

  // Wide / no-ball if low accuracy
  const wideChance = clamp(0.04 + (50 - s.accuracy) / 400 + (line === "Wide" ? 0.15 : 0), 0.02, 0.3);
  if (Math.random() < wideChance) {
    return {
      runs: 1, isWicket: false, isBoundary: false, isExtra: true, extraType: "Wide",
      commentary: `Wide called — ${player.name} drifts it down leg.`,
      delivery,
    };
  }

  // Wicket chance — capped lower so 8/10 wicket hauls are extremely rare
  let wicketChance = 0.025 + skillRatio * 0.04 + conf * 0.015;
  if (delivery === "Yorker" && length === "Yorker") wicketChance += 0.06;
  if (delivery === "Bouncer" && length === "Short") wicketChance += 0.03;
  if (delivery === "Outswinger" && length === "Good" && line === "Off") wicketChance += 0.04;
  if (delivery === "Inswinger" && length === "Full" && line === "Stump") wicketChance += 0.04;
  if ((delivery === "Off-Break" || delivery === "Leg-Break" || delivery === "Doosra") && length === "Good") wicketChance += 0.025;
  wicketChance *= 1 + pressure * 0.15;
  wicketChance *= fitWicketMult;
  // Hard cap — base wicket rate per ball about 1/30 even on great deliveries
  wicketChance = clamp(wicketChance, 0.005, 0.10);

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

  // Run outcome
  const runs: number[] = [0, 1, 2, 3, 4, 6];
  let weights = [40, 30, 10, 2, 12, 6];
  if (length === "Short" && (line === "Off" || line === "Wide")) weights = [25, 25, 10, 2, 25, 13];
  if (length === "Yorker") weights = [55, 30, 5, 1, 7, 2];
  if (length === "Full" && line === "Stump") weights = [45, 30, 10, 2, 10, 3];
  weights = weights.map((w, i) => {
    if (runs[i] >= 4) return w * clamp(1 - skillRatio * 0.4, 0.3, 1.5) * fitEconBoost;
    if (runs[i] === 0) return w * (1 + skillRatio * 0.3) / fitEconBoost;
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
    case "Test": return 90;
    case "Club": return 30;
  }
}
