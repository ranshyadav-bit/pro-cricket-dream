import type {
  CareerStats,
  Fixture,
  InboxMessage,
  Player,
  SaveGame,
  Skills,
} from "./types";
import { clamp, overallRating, trainSkill } from "./rating";
import { emptyStats, generateFixtures, makeId } from "./factory";
import { advanceLeagues, createLeaguesState } from "./leagues";
import { generateAnnualOffers } from "./contracts";
import { newTournamentsForYear, advanceTournaments, tournamentsForYear } from "./tournaments";
import { maybeCaptainPromotion, maybeScoutOffer } from "./scouts";

// --- Stat helpers ---

export function mergeMatchStats(career: CareerStats, m: {
  runs: number; balls: number; fours: number; sixes: number; out: boolean;
  wickets: number; runsConceded: number; ballsBowled: number;
  catches: number; manOfMatch: boolean; played: boolean;
}): CareerStats {
  if (!m.played) return career;
  const next = { ...career };
  next.matches += 1;
  if (m.balls > 0 || m.runs > 0 || m.out) {
    next.innings += 1;
    next.runs += m.runs;
    next.ballsFaced += m.balls;
    next.fours += m.fours;
    next.sixes += m.sixes;
    if (!m.out) next.notOuts += 1;
    if (m.runs >= 100) next.hundreds += 1;
    else if (m.runs >= 50) next.fifties += 1;
    if (m.runs > next.highestScore) next.highestScore = m.runs;
  }
  next.ballsBowled += m.ballsBowled;
  next.runsConceded += m.runsConceded;
  next.wickets += m.wickets;
  next.oversBowled = Math.floor(next.ballsBowled / 6) + (next.ballsBowled % 6) / 10;
  if (m.wickets >= 5) next.fiveFors += 1;
  if (m.wickets > next.bestBowlingWickets ||
      (m.wickets === next.bestBowlingWickets && m.runsConceded < next.bestBowlingRuns)) {
    next.bestBowlingWickets = m.wickets;
    next.bestBowlingRuns = m.runsConceded;
  }
  next.catches += m.catches;
  if (m.manOfMatch) next.manOfMatch += 1;
  return next;
}

export function battingAverage(stats: CareerStats): string {
  const outs = stats.innings - stats.notOuts;
  if (outs <= 0) return stats.runs > 0 ? "—" : "0.00";
  return (stats.runs / outs).toFixed(2);
}

export function strikeRate(stats: CareerStats): string {
  if (stats.ballsFaced === 0) return "0.00";
  return ((stats.runs / stats.ballsFaced) * 100).toFixed(2);
}

export function bowlingAverage(stats: CareerStats): string {
  if (stats.wickets === 0) return "—";
  return (stats.runsConceded / stats.wickets).toFixed(2);
}

export function economy(stats: CareerStats): string {
  if (stats.ballsBowled === 0) return "—";
  return ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2);
}

// --- Training ---

export type TrainingDrill = {
  key: keyof Skills;
  label: string;
  energy: number;
  xp: number;
};

export const TRAINING_DRILLS: TrainingDrill[] = [
  { key: "timing",    label: "Net Timing Drill",     energy: 15, xp: 1.6 },
  { key: "technique", label: "Technique Reps",       energy: 15, xp: 1.6 },
  { key: "power",     label: "Power Hitting Range",  energy: 20, xp: 2.0 },
  { key: "patience",  label: "Leave & Defend Lab",   energy: 10, xp: 1.2 },
  { key: "pace",      label: "Pace & Run-Up",        energy: 20, xp: 2.0 },
  { key: "accuracy",  label: "Yorker Targets",       energy: 15, xp: 1.6 },
  { key: "movement",  label: "Swing / Spin Lab",     energy: 15, xp: 1.6 },
  { key: "variation", label: "Variation Workshop",   energy: 15, xp: 1.6 },
  { key: "fitness",   label: "Gym & Conditioning",   energy: 25, xp: 2.0 },
  { key: "composure", label: "Pressure Sim",         energy: 15, xp: 1.4 },
];

export function applyTraining(save: SaveGame, drillKeys: string[]): {
  save: SaveGame;
  energyUsed: number;
  injuries: string[];
} {
  let skills = { ...save.player.skills };
  let energyUsed = 0;
  const injuries: string[] = [];
  for (const k of drillKeys) {
    const drill = TRAINING_DRILLS.find((d) => d.key === k);
    if (!drill) continue;
    energyUsed += drill.energy;
    skills = trainSkill(skills, drill.key, drill.xp, save.player.potential);
    const risk = (energyUsed / 100) * (1 - save.player.fitness / 100) * 0.15;
    if (Math.random() < risk) {
      injuries.push(`Minor ${drill.label.toLowerCase()} strain — fitness -8`);
    }
  }
  let fitness = save.player.fitness - Math.min(15, energyUsed / 8);
  if (injuries.length > 0) fitness -= 8 * injuries.length;
  fitness = clamp(fitness, 20, 100);
  const player: Player = { ...save.player, skills, fitness };
  return { save: { ...save, player }, energyUsed, injuries };
}

// Heavy training preset — auto-fired before a match week
export function heavyTraining(save: SaveGame): SaveGame {
  // Pick 3 drills relevant to role
  const isBatter = ["Top-Order Bat", "Middle-Order Bat", "Finisher", "Wicket-Keeper Bat", "All-Rounder"].includes(save.player.role);
  const drills = isBatter ? ["timing", "power", "fitness"] : ["pace", "accuracy", "fitness"];
  return applyTraining(save, drills).save;
}

// --- Week advance / sim ---

export function nextFixture(save: SaveGame): Fixture | null {
  const future = save.fixtures
    .filter((f) => !f.played && (f.year > save.year || (f.year === save.year && f.week >= save.week)))
    .sort((a, b) => (a.year - b.year) * 100 + (a.week - b.week));
  return future[0] ?? null;
}

// Sim one fixture without user playing
export function simFixture(player: Player, fixture: Fixture): {
  runs: number; balls: number; fours: number; sixes: number; out: boolean;
  wickets: number; runsConceded: number; ballsBowled: number;
  catches: number; manOfMatch: boolean; result: "Win" | "Loss" | "Draw";
  summary: string;
} {
  const rating = overallRating(player);
  const isBatter = ["Top-Order Bat", "Middle-Order Bat", "Finisher", "Wicket-Keeper Bat", "All-Rounder"].includes(player.role);
  const isBowler = !["Top-Order Bat", "Middle-Order Bat", "Finisher", "Wicket-Keeper Bat"].includes(player.role);
  const ratingFactor = clamp((rating - 40) / 60, 0.05, 1.5);
  const formFactor = (player.confidence + player.morale) / 200;
  // Fitness penalty: <50 drops output, <30 cripples it
  const fit = player.fitness;
  const fitFactor = fit < 30 ? 0.35 : fit < 50 ? 0.65 : 1.0;
  const fitWicketFactor = fit < 30 ? 0.3 : fit < 50 ? 0.6 : 1.0;

  let runs = 0, balls = 0, fours = 0, sixes = 0, out = true;
  if (isBatter || player.role === "All-Rounder") {
    const expected = (18 + ratingFactor * 35 + formFactor * 18) * fitFactor;
    runs = Math.max(0, Math.round(expected + (Math.random() - 0.5) * 30));
    balls = Math.max(runs, Math.round(runs / (0.6 + ratingFactor * 0.5)));
    fours = Math.round(runs * 0.10);
    sixes = Math.round(runs * 0.04);
    out = Math.random() < 0.85;
  }

  let wickets = 0, runsConceded = 0, ballsBowled = 0;
  if (isBowler || player.role === "All-Rounder") {
    ballsBowled = fixture.format === "T20" ? 24 : fixture.format === "ODI" ? 60 : 150;
    // Realistic wickets: mostly 1-3, rarely 5
    const wRand = Math.random();
    let baseW: number;
    if (wRand < 0.20) baseW = 0;
    else if (wRand < 0.55) baseW = 1;
    else if (wRand < 0.80) baseW = 2;
    else if (wRand < 0.95) baseW = 3;
    else if (wRand < 0.99) baseW = 4;
    else baseW = 5; // ~1% five-for
    // Skill nudges up slightly
    if (ratingFactor > 1.0 && Math.random() < 0.2) baseW += 1;
    wickets = clamp(Math.round(baseW * fitWicketFactor), 0, 5);
    const econ = clamp(8.5 - ratingFactor * 3 + (Math.random() - 0.5) * 1.5 + (fit < 30 ? 2.5 : fit < 50 ? 1.2 : 0), 4, 14);
    runsConceded = Math.round((ballsBowled / 6) * econ);
  }
  const catches = Math.random() < 0.35 ? 1 : 0;
  const manOfMatch = (runs >= 60 || wickets >= 4) && Math.random() < 0.4;
  const result: "Win" | "Loss" | "Draw" =
    Math.random() < 0.45 + ratingFactor * 0.1 ? "Win" : Math.random() < 0.3 ? "Draw" : "Loss";

  const lines: string[] = [];
  if (runs > 0 || balls > 0) lines.push(`${runs}${out ? "" : "*"} (${balls})`);
  if (ballsBowled > 0) lines.push(`${wickets}/${runsConceded}`);
  return {
    runs, balls, fours, sixes, out,
    wickets, runsConceded, ballsBowled,
    catches, manOfMatch, result,
    summary: lines.join(" · ") || "DNB",
  };
}

// Fitness recovery + confidence drift each week
export function weeklyDrift(player: Player, performance: "good" | "neutral" | "bad" | "rest"): Player {
  let fitness = player.fitness;
  let confidence = player.confidence;
  let morale = player.morale;
  if (performance === "rest") fitness = clamp(fitness + 12, 20, 100);
  else fitness = clamp(fitness + 3, 20, 100);
  if (performance === "good") { confidence = clamp(confidence + 8, 0, 100); morale = clamp(morale + 4, 0, 100); }
  if (performance === "bad")  { confidence = clamp(confidence - 10, 0, 100); morale = clamp(morale - 4, 0, 100); }
  return { ...player, fitness, confidence, morale };
}

// Tier promotion
export function checkPromotion(save: SaveGame): { tier: Player["tier"]; team?: string; message?: string } | null {
  const rating = overallRating(save.player);
  const t = save.player.tier;
  if (t === "Club" && rating >= 62 && save.stats.matches >= 5) {
    return { tier: "Domestic", team: pickTeam("Domestic", save.player.nation), message: "Selected for the State squad — domestic cricket awaits!" };
  }
  if (t === "Domestic" && rating >= 72 && save.stats.matches >= 20) {
    return { tier: "National A", team: pickTeam("National A", save.player.nation), message: "Called up to the National A side — one step from full honours." };
  }
  if (t === "National A" && rating >= 78 && save.stats.matches >= 35) {
    return { tier: "International", team: `${save.player.nation} National Team`, message: "INTERNATIONAL CALL-UP! You've earned your country's cap." };
  }
  return null;
}

const DOMESTIC_TEAMS_BY_NATION: Record<string, string[]> = {
  Australia: ["NSW Blues", "Victoria Bushrangers", "Queensland Bulls", "WA Warriors"],
  England: ["Surrey", "Yorkshire", "Lancashire", "Middlesex"],
  India: ["Mumbai", "Karnataka", "Delhi", "Tamil Nadu"],
  Pakistan: ["Lahore", "Karachi", "Islamabad", "Multan"],
  "South Africa": ["Western Province", "Titans", "Lions", "Dolphins"],
  "New Zealand": ["Auckland Aces", "Wellington Firebirds", "Otago Volts", "Canterbury"],
  "West Indies": ["Trinidad & Tobago", "Barbados", "Jamaica", "Guyana"],
  "Sri Lanka": ["Colombo", "Galle", "Kandy", "Jaffna"],
  Bangladesh: ["Dhaka", "Chittagong", "Khulna", "Rajshahi"],
};

function pickTeam(tier: Player["tier"], nation: Player["nation"]): string {
  if (tier === "International") return `${nation} National Team`;
  if (tier === "National A") return `${nation} A`;
  if (tier === "Domestic") {
    const teams = DOMESTIC_TEAMS_BY_NATION[nation] ?? ["Domestic XI"];
    return teams[Math.floor(Math.random() * teams.length)];
  }
  return "Local Club";
}

// Decide auto behaviour: heavy training pre-match, rest after a match
function nextActionForWeek(save: SaveGame): "heavyTrain" | "rest" | "neutral" {
  // If a fixture exists in the next 1-2 weeks, train heavy
  const upcoming = save.fixtures.find((f) =>
    !f.played && f.year === save.year &&
    f.week >= save.week && f.week <= save.week + 1,
  );
  if (upcoming) return "heavyTrain";
  // If we just played a match this week, rest
  const justPlayed = save.fixtures.find((f) => f.played && f.year === save.year && f.week === save.week);
  if (justPlayed) return "rest";
  // Low fitness → rest
  if (save.player.fitness < 55) return "rest";
  return "heavyTrain"; // default to staying sharp
}

// Advance one week
export function advanceWeek(save: SaveGame, opts: { restWeek?: boolean; skipAuto?: boolean } = {}): {
  save: SaveGame;
  newMessages: InboxMessage[];
  simmedFixtures: Array<{ fixture: Fixture; result: ReturnType<typeof simFixture> }>;
} {
  let next: SaveGame = { ...save };
  let player: Player = { ...next.player };
  const messages: InboxMessage[] = [];
  const simmed: Array<{ fixture: Fixture; result: ReturnType<typeof simFixture> }> = [];
  let stats = { ...next.stats };
  let seasonStats = { ...next.seasonStats };

  // Auto train/rest decision for this week (before fixture sim)
  if (!opts.skipAuto) {
    const action = opts.restWeek ? "rest" : nextActionForWeek(next);
    if (action === "heavyTrain") {
      const trained = heavyTraining(next);
      next = trained;
      player = { ...trained.player };
    } else if (action === "rest") {
      player = { ...player, fitness: clamp(player.fitness + 12, 20, 100) };
    }
  }

  // Find fixtures in current week or earlier that aren't played
  const fixturesNow = next.fixtures.filter(
    (f) => !f.played && f.year === next.year && f.week <= next.week,
  );
  for (const f of fixturesNow) {
    const sim = simFixture(player, f);
    simmed.push({ fixture: f, result: sim });
    f.played = true;
    stats = mergeMatchStats(stats, { ...sim, played: true });
    seasonStats = mergeMatchStats(seasonStats, { ...sim, played: true });
    const grade = (sim.runs >= 50 || sim.wickets >= 3) ? "good" : (sim.runs <= 5 && sim.wickets === 0) ? "bad" : "neutral";
    player = weeklyDrift(player, grade);
    messages.push({
      id: makeId(), week: f.week, year: f.year,
      from: f.competition,
      subject: `Result vs ${f.opponent} — ${sim.result}`,
      body: `Match simulated. Your contribution: ${sim.summary}.${sim.manOfMatch ? " You were named Player of the Match!" : ""}`,
      read: false, type: "system",
    });
  }
  if (fixturesNow.length === 0 && opts.restWeek) {
    player = weeklyDrift(player, "rest");
  }

  // Aging
  player.age = Math.round((player.age + 1 / 52) * 100) / 100;
  next.player = player;
  next.stats = stats;
  next.seasonStats = seasonStats;

  // Promotion check (auto tier)
  const promo = checkPromotion(next);
  if (promo) {
    player = { ...player, tier: promo.tier, team: promo.team ?? player.team };
    if (promo.tier === "International") {
      next.contractSlots = { ...(next.contractSlots ?? { franchise: null, nation: null }), nation: { team: promo.team!, expiresYear: next.year + 2 } };
    }
    messages.push({
      id: makeId(), week: next.week, year: next.year,
      from: "Selection Committee",
      subject: `Promotion: ${promo.tier}`,
      body: promo.message ?? "You've been promoted.",
      read: false, type: "milestone",
    });
    // Regenerate fixtures for new tier from current week onward
    next.fixtures = [
      ...next.fixtures.filter((f) => f.played),
      ...generateFixtures(next.year, promo.tier, player).filter((f) => f.week >= next.week),
    ];
  }
  next.player = player;

  // Captain promotion
  const capMsg = maybeCaptainPromotion(next);
  if (capMsg) {
    next.player = { ...next.player, perks: [...next.player.perks, "Captain"] };
    messages.push(capMsg);
  }

  // Advance week counter
  next.week += 1;
  if (next.week > 52) {
    next.week = 1;
    next.year += 1;
    next.seasonStats = emptyStats();
    next.fixtures = generateFixtures(next.year, next.player.tier, next.player);
    next.player = { ...next.player, age: Math.round(next.player.age + 0.01) };
    next.leagues = createLeaguesState(next.year);
    // Generate new tournaments for the year
    const newTournys = newTournamentsForYear(next.year);
    next.tournaments = { active: [...(next.tournaments?.active ?? []).filter((t) => !t.finished), ...newTournys], history: next.tournaments?.history ?? [] };
    // Tournament invitations
    if (next.player.tier === "International") {
      for (const t of newTournys) {
        messages.push({
          id: makeId(), week: 1, year: next.year,
          from: `${next.player.nation} Cricket Board`,
          subject: `Selected for ${t.name} ${next.year}`,
          body: `You've been called up to represent ${next.player.nation} at the ${t.name} ${next.year}. Tournament begins around week ${t.startWeek}. Bring your best.`,
          read: false, type: "milestone",
        });
      }
    }
    messages.push({
      id: makeId(), week: 1, year: next.year,
      from: "PCC News",
      subject: `Welcome to the ${next.year} season`,
      body: `A new season begins. Your stats reset, but your career legacy carries on.${tournamentsForYear(next.year).length > 0 ? " ICC tournaments are scheduled this year." : ""}`,
      read: false, type: "system",
    });
  }

  // Advance parallel leagues
  if (!next.leagues) next.leagues = createLeaguesState(next.year);
  next.leagues = advanceLeagues(next.leagues, next.week, next.year);

  // Advance ICC tournaments
  if (!next.tournaments) next.tournaments = { active: newTournamentsForYear(next.year), history: [] };
  next.tournaments = advanceTournaments(next.tournaments, next.week, next.year);

  // Annual contract offers — Week 48
  if (!next.offerYears) next.offerYears = [];
  if (next.week >= 48 && !next.offerYears.includes(next.year) && !next.player.retired) {
    const offers = generateAnnualOffers(next);
    if (offers.length > 0) {
      next.offerYears = [...next.offerYears, next.year];
      for (const o of offers) {
        // Skip if conflicts with existing contract slot
        const cs = next.contractSlots ?? { franchise: null, nation: null };
        const isFranchise = !!o.league;
        const isNation = o.tier === "International";
        if (isFranchise && cs.franchise) continue;
        if (isNation && cs.nation) continue;
        messages.push({
          id: makeId(), week: next.week, year: next.year,
          from: o.fromTeam,
          subject: `Contract offer · ${o.league ?? o.format} · $${(o.basePrice + o.signingBonus).toLocaleString()}k`,
          body:
            `${o.fromTeam} have made a formal offer.\n\n` +
            `Format: ${o.format}${o.league ? " (" + o.league + ")" : ""}\n` +
            `Base price: $${o.basePrice.toLocaleString()}k\n` +
            `Signing bonus: $${o.signingBonus.toLocaleString()}k\n` +
            `Length: ${o.durationYears} year${o.durationYears > 1 ? "s" : ""}\n\n` +
            `Open this message in your inbox to accept, decline, or negotiate.`,
          read: false, type: "contract",
          offer: { ...o },
        });
      }
    }
  }

  // Retirement check
  if ((next.player.age >= 35 && (next.player.fitness < 60 || Math.random() < 0.05)) || next.player.age >= 40) {
    next.player.retired = true;
    messages.push({
      id: makeId(), week: next.week, year: next.year,
      from: "Press Conference",
      subject: "Retirement",
      body: `${next.player.name} has announced their retirement at age ${Math.floor(next.player.age)}. What a career.`,
      read: false, type: "milestone",
    });
  }

  next.inbox = [...messages, ...next.inbox].slice(0, 60);
  return { save: next, newMessages: messages, simmedFixtures: simmed };
}
