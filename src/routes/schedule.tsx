import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { generateFixtures } from "@/game/factory";
import {
  DEFAULT_SCHEDULE_PRIORITIES,
  PRIORITY_LABELS,
  getSchedulePriorities,
  type SaveGame,
} from "@/game/types";

export const Route = createFileRoute("/schedule")({
  component: Schedule,
});

function Schedule() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setSave(s);
    setOrder(getSchedulePriorities(s.schedulePriorities));
  }, [navigate]);

  const dirty = useMemo(() => {
    if (!save) return false;
    const current = getSchedulePriorities(save.schedulePriorities);
    return order.join("|") !== current.join("|");
  }, [order, save]);

  if (!save) return null;

  const move = (idx: number, delta: number) => {
    const next = [...order];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    setSavedMsg(null);
  };

  const reset = () => {
    setOrder([...DEFAULT_SCHEDULE_PRIORITIES]);
    setSavedMsg(null);
  };

  const savePriorities = (regenerate: boolean) => {
    const next: SaveGame = { ...save, schedulePriorities: order };
    if (regenerate) {
      const played = save.fixtures.filter((f) => f.played);
      const fresh = generateFixtures(
        save.year,
        save.player.tier,
        save.player,
        save.contractSlots,
        order,
        save.tournaments,
      ).filter((f) => f.week >= save.week);
      next.fixtures = [...played, ...fresh];
    }
    writeSave(next);
    setSave(next);
    setSavedMsg(regenerate
      ? "Priorities saved. Upcoming fixtures rebuilt to match your new order."
      : "Priorities saved. They'll apply when next season's schedule is generated.");
  };

  return (
    <GameShell>
      <h1 className="mb-1 text-display text-2xl">Schedule Priorities</h1>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        When two competitions would land on the same week, the one ranked higher
        here wins the slot. Put the ICC tournaments above your franchise league
        if you want World Cup weeks to override IPL/BBL/PSL fixtures.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GamePanel title="Priority Order" subtitle="Top = highest priority">
          <ul className="space-y-2">
            {order.map((key, idx) => (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <p className="text-display text-sm text-foreground">
                    {idx + 1}. {key}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PRIORITY_LABELS[key] ?? key}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label="Move up"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-card disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move down"
                    onClick={() => move(idx, 1)}
                    disabled={idx === order.length - 1}
                    className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-card disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </GamePanel>

        <GamePanel title="Apply Changes">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => savePriorities(true)}
              disabled={!dirty}
              className="rounded-md bg-gradient-primary px-4 py-2.5 text-display text-sm text-primary-foreground disabled:opacity-40"
            >
              Save & Rebuild Upcoming Fixtures
            </button>
            <button
              onClick={() => savePriorities(false)}
              disabled={!dirty}
              className="rounded-md border border-border px-4 py-2.5 text-display text-sm text-foreground hover:bg-card/80 disabled:opacity-40"
            >
              Save (apply next season)
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-border px-4 py-2.5 text-display text-sm text-muted-foreground hover:bg-card/80"
            >
              Reset to defaults
            </button>
            {savedMsg && (
              <p className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">
                {savedMsg}
              </p>
            )}
          </div>
        </GamePanel>

        <GamePanel title="How it works">
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>· Each week, every active commitment proposes a fixture.</li>
            <li>· If two propose the same week, the one ranked higher here is kept.</li>
            <li>· ICC weeks are derived from active tournaments (T20 WC, ODI WC, WTC).</li>
            <li>· Played fixtures aren't touched — only upcoming weeks are rebuilt.</li>
          </ul>
        </GamePanel>
      </div>
    </GameShell>
  );
}
