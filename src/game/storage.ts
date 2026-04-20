import type { SaveGame } from "./types";

const SAVE_KEY = "pcc26-save-v1";

export function loadSave(): SaveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveGame;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSave(save: SaveGame): void {
  if (typeof window === "undefined") return;
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
