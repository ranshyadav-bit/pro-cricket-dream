import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave } from "@/game/storage";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/fixtures")({
  component: Fixtures,
});

function Fixtures() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const upcoming = save.fixtures
    .filter((f) => !f.played)
    .sort((a, b) => (a.year - b.year) * 100 + (a.week - b.week));
  const past = save.fixtures.filter((f) => f.played).reverse();

  return (
    <GameShell>
      <h1 className="mb-4 text-display text-2xl">Fixtures · {save.year}</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GamePanel title="Upcoming" subtitle={`${upcoming.length} scheduled`}>
          <ul className="space-y-2">
            {upcoming.length === 0 && <li className="text-sm">No fixtures left this season.</li>}
            {upcoming.map((f) => {
              const isThisWeek = f.year === save.year && f.week === save.week;
              return (
                <li key={f.id} className={`rounded-md border p-3 ${isThisWeek ? "border-primary/40 bg-primary/5" : "border-border bg-background/30"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-display text-sm text-foreground">vs {f.opponent}</span>
                    <span className="text-[10px] text-muted-foreground">W{f.week}·{f.year}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{f.competition} · {f.format} · {f.venue}</p>
                  {isThisWeek && (
                    <Link
                      to="/match"
                      search={{ id: f.id }}
                      className="mt-2 inline-block rounded-md bg-gradient-primary px-3 py-1.5 text-[11px] text-display text-primary-foreground"
                    >
                      Play Now →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </GamePanel>

        <GamePanel title="Recent Results" subtitle={`${past.length} played`}>
          <ul className="space-y-2">
            {past.length === 0 && <li className="text-sm">No matches played yet.</li>}
            {past.slice(0, 12).map((f) => (
              <li key={f.id} className="rounded-md border border-border bg-background/30 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-foreground">vs {f.opponent}</span>
                  <span className="text-[10px] text-muted-foreground">W{f.week}·{f.year}</span>
                </div>
                <p className="text-xs text-muted-foreground">{f.competition} · {f.format}</p>
              </li>
            ))}
          </ul>
        </GamePanel>
      </div>
    </GameShell>
  );
}
