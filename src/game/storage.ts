import type { SaveGame } from "./types";
import { createLeaguesState } from "./leagues";
import { newTournamentsForYear } from "./tournaments";

const SAVE_KEY = "pcc26-save-v1";

function ensureDerived(save: SaveGame): SaveGame {
  if (!save.leagues) {
    save.leagues = createLeaguesState(save.year);
  }
  if (!save.offerYears) save.offerYears = [];
  if (typeof save.contractValue !== "number") save.contractValue = 0;
  if (!save.contractSlots) save.contractSlots = { franchise: null, nation: null };
  if (!save.tournaments) save.tournaments = { active: newTournamentsForYear(save.year), history: [] };
  if (save.matchInProgress === undefined) save.matchInProgress = null;
  return save;
}

export function loadSave(): SaveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveGame;
    if (parsed.version !== 1) return null;
    return ensureDerived(parsed);
  } catch {
    return null;
  }
}

export function writeSave(save: SaveGame): void {
  if (typeof window === "undefined") return;
  ensureDerived(save);
  save.lastPlayedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function deleteSave(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SAVE_KEY);
}
