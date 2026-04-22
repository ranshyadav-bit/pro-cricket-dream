import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave } from "@/game/storage";
import type { SaveGame } from "@/game/types";
import type { Tournament } from "@/game/tournaments";

export const Route = createFileRoute("/tournaments")({
  component: TournamentsPage,
});

function TournamentsPage() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const tournaments = save.tournaments?.active ?? [];
  const history = save.tournaments?.history ?? [];
  const active: Tournament | null = tournaments.find((t) => t.id + t.year === activeId) ?? tournaments[0] ?? null;

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl">ICC Tournaments</h1>
          <p className="text-xs text-muted-foreground">T20 World Cup · ODI World Cup · World Test Championship</p>
        </div>
        <Link to="/leagues" className="text-xs text-primary underline">World leagues →</Link>
      </div>

      {tournaments.length === 0 && (
        <GamePanel title="No active tournaments">
          <p className="text-sm text-muted-foreground">
            Major ICC events are held on a rotating cycle. The next one will be announced when it begins.
          </p>
        </GamePanel>
      )}

      {tournaments.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {tournaments.map((t) => {
              const tid = t.id + t.year;
              const isActive = (active?.id + active?.year) === tid;
              return (
                <button
                  key={tid}
                  onClick={() => setActiveId(tid)}
                  className={`rounded-md border px-3 py-2 text-display text-xs transition-colors ${
                    isActive
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.name} {t.year}
                </button>
              );
            })}
          </div>

          {active && (
            <>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="text-display text-sm text-foreground">
                  {active.name} {active.year} · {active.format} · Hosts: {active.host}
                </p>
                {active.champion && (
                  <p className="text-display text-xs text-primary">🏆 {active.champion}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <GamePanel title="Standings (Group)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                          <th className="py-1.5">#</th>
                          <th>Nation</th>
                          <th className="text-right">P</th>
                          <th className="text-right">W</th>
                          <th className="text-right">L</th>
                          <th className="text-right">Pts</th>
                          <th className="text-right">NRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(active.standings)
                          .sort((a, b) => b.points - a.points || b.nrr - a.nrr)
                          .map((s, i) => (
                            <tr
                              key={s.nation}
                              className={`border-t border-border ${s.nation === save.player.nation ? "bg-primary/10 text-primary" : ""}`}
                            >
                              <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                              <td className="text-display">{s.nation}</td>
                              <td className="text-right">{s.played}</td>
                              <td className="text-right">{s.wins}</td>
                              <td className="text-right">{s.losses}</td>
                              <td className="text-right text-display">{s.points}</td>
                              <td className="text-right">{s.nrr.toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </GamePanel>

                <GamePanel title="Matches">
                  <ul className="space-y-1.5 text-xs">
                    {active.matches.map((m) => (
                      <li key={m.id} className={`rounded-md border p-2 ${
                        (m.home === save.player.nation || m.away === save.player.nation) && save.player.tier === "International"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background/30"
                      }`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-display">
                            {m.home} {m.played ? `${m.homeRuns}/${m.homeWickets}` : ""} vs {m.away} {m.played ? `${m.awayRuns}/${m.awayWickets}` : ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{m.stage} · W{m.week}</span>
                        </div>
                        {m.played && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {m.winner ? `${m.winner} won` : "Tied / no result"}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </GamePanel>
              </div>
            </>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-display text-sm uppercase tracking-widest text-muted-foreground">Past champions</h2>
          <GamePanel>
            <ul className="space-y-1 text-xs">
              {history.slice().reverse().map((h, i) => (
                <li key={i} className="flex items-baseline justify-between gap-2 border-b border-border py-1 last:border-0">
                  <span className="text-display">{h.id} · {h.year}</span>
                  <span className="text-primary">🏆 {h.champion}</span>
                </li>
              ))}
            </ul>
          </GamePanel>
        </div>
      )}
    </GameShell>
  );
}
