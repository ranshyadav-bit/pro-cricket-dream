import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { loadSave, deleteSave } from "@/game/storage";
import { battingAverage, bowlingAverage, economy, strikeRate } from "@/game/career";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/career-end")({
  component: CareerEnd,
});

function CareerEnd() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  return (
    <GameShell>
      <div className="mx-auto max-w-2xl py-10 text-center">
        <p className="text-display text-xs text-primary">Career Concluded</p>
        <h1 className="mt-3 text-display text-4xl">{save.player.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Retired at age {Math.floor(save.player.age)} · {save.player.tier} · {save.player.team}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Matches" value={save.stats.matches} />
          <Stat label="Runs" value={save.stats.runs} />
          <Stat label="Avg" value={battingAverage(save.stats)} />
          <Stat label="100s" value={save.stats.hundreds} />
          <Stat label="Wickets" value={save.stats.wickets} />
          <Stat label="Bowl Avg" value={bowlingAverage(save.stats)} />
          <Stat label="Econ" value={economy(save.stats)} />
          <Stat label="MoM Awards" value={save.stats.manOfMatch} />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          A long chapter ends. The game world rolls on without you.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              if (confirm("Start a new career? This deletes the current save.")) {
                deleteSave();
                navigate({ to: "/new" });
              }
            }}
            className="rounded-md bg-gradient-primary px-6 py-3 text-display text-sm text-primary-foreground shadow-glow"
          >
            Start a New Career
          </button>
        </div>
      </div>
    </GameShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-display text-2xl text-primary">{value}</p>
    </div>
  );
}
