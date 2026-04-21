import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave } from "@/game/storage";
import {
  getOrangeCap,
  getPurpleCap,
  getStandings,
  LEAGUE_BY_ID,
  LEAGUE_LABEL,
} from "@/game/leagues";
import type { LeagueId } from "@/game/rosters";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/leagues")({
  component: LeaguesPage,
});

const LEAGUES: LeagueId[] = ["IPL", "BBL", "PSL", "County"];

function LeaguesPage() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [active, setActive] = useState<LeagueId>("IPL");

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save || !save.leagues) return null;

  const season = save.leagues.seasons[active];
  const standings = useMemo(() => getStandings(season), [season]);
  const orange = useMemo(() => getOrangeCap(season, 10), [season]);
  const purple = useMemo(() => getPurpleCap(season, 10), [season]);
  const teams = LEAGUE_BY_ID[active];
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const teamShort = (id: string) => teams.find((t) => t.id === id)?.short ?? id;

  const playerTeamId = teams.find((t) => t.name === save.player.team)?.id;

  const upcoming = season.fixtures.filter((f) => !f.played).slice(0, 8);
  const recent = season.fixtures.filter((f) => f.played).slice(-8).reverse();

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl">World Leagues · {save.year}</h1>
          <p className="text-xs text-muted-foreground">Live parallel simulation across IPL, BBL, PSL & County.</p>
        </div>
        <Link to="/fixtures" className="text-xs text-primary underline">Your calendar →</Link>
      </div>

      {/* League selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LEAGUES.map((l) => (
          <button
            key={l}
            onClick={() => setActive(l)}
            className={`rounded-md border px-3 py-2 text-display text-xs transition-colors ${
              active === l
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="mb-3 text-display text-sm text-foreground">{LEAGUE_LABEL[active]}{season.champion ? ` · 🏆 ${teamName(season.champion)}` : ""}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Standings */}
        <GamePanel title="Standings">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-1.5">#</th>
                  <th>Team</th>
                  <th className="text-right">P</th>
                  <th className="text-right">W</th>
                  <th className="text-right">L</th>
                  <th className="text-right">Pts</th>
                  <th className="text-right">NRR</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.teamId}
                    className={`border-t border-border ${s.teamId === playerTeamId ? "bg-primary/10 text-primary" : ""}`}
                  >
                    <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="text-display">{teamShort(s.teamId)}</td>
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

        {/* Orange Cap */}
        <GamePanel title="🟠 Orange Cap" subtitle="Top run-scorers">
          <ol className="space-y-1 text-xs">
            {orange.length === 0 && <li className="text-muted-foreground">No matches yet this season.</li>}
            {orange.map((e, i) => (
              <li key={e.player} className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 ${e.player === save.player.name ? "bg-primary/15 text-primary" : ""}`}>
                <span><span className="text-muted-foreground">{i + 1}.</span> <span className="text-display">{e.player}</span> <span className="text-[10px] text-muted-foreground">({teamShort(e.teamId)})</span></span>
                <span className="text-display">{e.runs}</span>
              </li>
            ))}
          </ol>
        </GamePanel>

        {/* Purple Cap */}
        <GamePanel title="🟣 Purple Cap" subtitle="Top wicket-takers">
          <ol className="space-y-1 text-xs">
            {purple.length === 0 && <li className="text-muted-foreground">No matches yet this season.</li>}
            {purple.map((e, i) => (
              <li key={e.player} className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 ${e.player === save.player.name ? "bg-primary/15 text-primary" : ""}`}>
                <span><span className="text-muted-foreground">{i + 1}.</span> <span className="text-display">{e.player}</span> <span className="text-[10px] text-muted-foreground">({teamShort(e.teamId)})</span></span>
                <span className="text-display">{e.wickets}</span>
              </li>
            ))}
          </ol>
        </GamePanel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GamePanel title="Recent Results">
          <ul className="space-y-1.5 text-xs">
            {recent.length === 0 && <li className="text-muted-foreground">Season hasn't started yet.</li>}
            {recent.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-2 rounded-md border border-border bg-background/30 p-2">
                <span className="text-display">{teamShort(f.home)} {f.homeRuns}/{f.homeWickets} vs {teamShort(f.away)} {f.awayRuns}/{f.awayWickets}</span>
                <span className="text-[10px] text-muted-foreground">W{f.week} · {f.winner ? teamShort(f.winner) + " win" : "tied"}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
        <GamePanel title="Upcoming">
          <ul className="space-y-1.5 text-xs">
            {upcoming.length === 0 && <li className="text-muted-foreground">Season complete.</li>}
            {upcoming.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-2 rounded-md border border-border bg-background/30 p-2">
                <span className="text-display">{teamShort(f.home)} vs {teamShort(f.away)}</span>
                <span className="text-[10px] text-muted-foreground">W{f.week}</span>
              </li>
            ))}
          </ul>
        </GamePanel>
      </div>
    </GameShell>
  );
}
