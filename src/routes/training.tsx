import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel, Bar } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { TRAINING_DRILLS, applyTraining } from "@/game/career";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/training")({
  component: Training,
});

function Training() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [report, setReport] = useState<string[]>([]);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const energyLeft = 100 - picked.reduce((sum, k) => {
    const d = TRAINING_DRILLS.find((x) => x.key === k);
    return sum + (d?.energy ?? 0);
  }, 0);

  const toggle = (key: string) => {
    setPicked((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      const drill = TRAINING_DRILLS.find((d) => d.key === key)!;
      const used = cur.reduce((sum, k) => sum + (TRAINING_DRILLS.find((x) => x.key === k)?.energy ?? 0), 0);
      if (used + drill.energy > 100) return cur;
      return [...cur, key];
    });
  };

  const runWeek = () => {
    if (picked.length === 0) return;
    const result = applyTraining(save, picked);
    writeSave(result.save);
    setSave(result.save);
    const lines = [
      `Trained ${picked.length} drill${picked.length > 1 ? "s" : ""} (${result.energyUsed} energy).`,
      ...result.injuries,
      "Skill gains applied. Rest a week if fitness is low.",
    ];
    setReport(lines);
    setPicked([]);
  };

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-display text-2xl text-foreground">Training</h1>
          <p className="text-xs text-muted-foreground">Spend up to 100 energy. Train smart, recover, repeat.</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Energy Left:</span>{" "}
          <span className="text-display text-base text-primary">{energyLeft}</span>
        </div>
      </div>

      {report.length > 0 && (
        <GamePanel>
          <ul className="space-y-1">
            {report.map((l, i) => (
              <li key={i} className="text-sm text-foreground">{l}</li>
            ))}
          </ul>
        </GamePanel>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GamePanel title="Drills">
          <div className="space-y-2">
            {TRAINING_DRILLS.map((d) => {
              const isPicked = picked.includes(d.key);
              const skillVal = save.player.skills[d.key];
              return (
                <button
                  key={d.key}
                  onClick={() => toggle(d.key)}
                  className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                    isPicked
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/40 hover:border-primary/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-display text-sm ${isPicked ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                      <span className="text-[10px] text-muted-foreground">{d.energy} energy</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">+{d.xp} {d.key} · current {Math.round(skillVal)}</p>
                    <div className="mt-1.5"><Bar value={skillVal} max={99} color="primary" /></div>
                  </div>
                </button>
              );
            })}
          </div>
        </GamePanel>

        <GamePanel
          title="Plan This Week"
          action={
            <button
              onClick={runWeek}
              disabled={picked.length === 0}
              className="rounded-md bg-gradient-primary px-4 py-2 text-display text-xs text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run Training Week
            </button>
          }
        >
          {picked.length === 0 ? (
            <p>Select drills from the left to fill your week.</p>
          ) : (
            <ul className="space-y-2">
              {picked.map((k) => {
                const d = TRAINING_DRILLS.find((x) => x.key === k)!;
                return (
                  <li key={k} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
                    <span className="text-sm text-foreground">{d.label}</span>
                    <button
                      onClick={() => toggle(k)}
                      className="text-xs text-destructive hover:underline"
                    >Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            Tip: Intense weeks raise injury risk if your fitness is below 70.
          </p>
        </GamePanel>
      </div>
    </GameShell>
  );
}
