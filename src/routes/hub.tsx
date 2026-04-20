import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel, StatBox, Bar } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { advanceWeek, battingAverage, bowlingAverage, economy, nextFixture, strikeRate } from "@/game/career";
import { battingRating, bowlingRating, overallRating } from "@/game/rating";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/hub")({
  component: Hub,
});

function Hub() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [tickerMsg, setTickerMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const fixture = nextFixture(save);
  const ovr = overallRating(save.player);
  const bat = battingRating(save.player);
  const bwl = bowlingRating(save.player);

  const advance = (rest = false) => {
    const result = advanceWeek(save, { restWeek: rest });
    writeSave(result.save);
    setSave(result.save);
    if (result.simmedFixtures.length > 0) {
      const f = result.simmedFixtures[0];
      setTickerMsg(`Simmed ${f.fixture.competition} vs ${f.fixture.opponent}: ${f.result.summary} (${f.result.result})`);
    } else {
      setTickerMsg("Quiet week. Recovery and routine.");
    }
  };

  return (
    <GameShell>
      {tickerMsg && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
          {tickerMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GamePanel title="Player Card" subtitle={`${save.player.nation} · ${save.player.tier}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-display text-2xl text-primary-foreground shadow-glow">
              {save.player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-display text-lg text-foreground">{save.player.name}</p>
              <p className="text-xs text-muted-foreground">{save.player.role} · Age {Math.floor(save.player.age)}</p>
              <p className="text-xs text-muted-foreground">{save.player.team}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBox label="OVR" value={ovr} accent />
            <StatBox label="BAT" value={bat} />
            <StatBox label="BWL" value={bwl} />
          </div>
          <div className="mt-4 space-y-2">
            <Meter label="Fitness" value={save.player.fitness} color="secondary" />
            <Meter label="Confidence" value={save.player.confidence} color="primary" />
            <Meter label="Morale" value={save.player.morale} color="accent" />
          </div>
        </GamePanel>

        <GamePanel
          title="Next Fixture"
          subtitle={fixture ? `Week ${fixture.week} · ${fixture.year}` : "No fixtures scheduled"}
          action={
            fixture && fixture.week === save.week && fixture.year === save.year ? (
              <Link
                to="/match"
                search={{ id: fixture.id }}
                className="rounded-md bg-gradient-primary px-4 py-2 text-display text-xs text-primary-foreground shadow-glow"
              >
                Play Match →
              </Link>
            ) : null
          }
        >
          {fixture ? (
            <div>
              <p className="text-display text-base text-foreground">vs {fixture.opponent}</p>
              <p className="text-xs text-muted-foreground">
                {fixture.competition} · {fixture.format} · {fixture.venue}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatBox label="In" value={
                  fixture.year === save.year && fixture.week === save.week
                    ? "This week"
                    : `${(fixture.year - save.year) * 52 + (fixture.week - save.week)}w`
                } />
                <StatBox label="Format" value={fixture.format} />
              </div>
              {fixture.week !== save.week || fixture.year !== save.year ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Advance the week to reach this fixture, or simulate weeks until then.
                </p>
              ) : null}
            </div>
          ) : (
            <p>Season concluded. Advance the week for off-season events.</p>
          )}
        </GamePanel>

        <GamePanel title="Quick Actions">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => advance(false)}
              className="rounded-md bg-gradient-primary px-4 py-2.5 text-display text-sm text-primary-foreground"
            >
              Advance Week →
            </button>
            <button
              onClick={() => advance(true)}
              className="rounded-md border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-display text-sm text-secondary"
            >
              Rest Week (+fitness)
            </button>
            <Link
              to="/training"
              className="rounded-md border border-border px-4 py-2.5 text-center text-display text-sm text-foreground hover:bg-card/80"
            >
              Plan Training
            </Link>
            <Link
              to="/fixtures"
              className="rounded-md border border-border px-4 py-2.5 text-center text-display text-sm text-foreground hover:bg-card/80"
            >
              View Calendar
            </Link>
          </div>
        </GamePanel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GamePanel title="Career Stats">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="Matches" value={save.stats.matches} />
            <StatBox label="Runs" value={save.stats.runs} />
            <StatBox label="Avg" value={battingAverage(save.stats)} />
            <StatBox label="SR" value={strikeRate(save.stats)} />
            <StatBox label="50s / 100s" value={`${save.stats.fifties} / ${save.stats.hundreds}`} />
            <StatBox label="Wickets" value={save.stats.wickets} />
            <StatBox label="Bowl Avg" value={bowlingAverage(save.stats)} />
            <StatBox label="Econ" value={economy(save.stats)} />
          </div>
          <div className="mt-3">
            <Link to="/stats" className="text-xs text-primary underline">Full stats →</Link>
          </div>
        </GamePanel>

        <GamePanel title="Inbox" subtitle={`${save.inbox.filter((m) => !m.read).length} unread`}>
          <ul className="space-y-2">
            {save.inbox.slice(0, 4).map((m) => (
              <li key={m.id} className={`rounded-md border p-3 ${!m.read ? "border-primary/30 bg-primary/5" : "border-border bg-background/30"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-display text-xs ${m.type === "milestone" ? "text-primary" : "text-foreground"}`}>{m.subject}</p>
                  <span className="text-[10px] text-muted-foreground">W{m.week}·{m.year}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link to="/inbox" className="text-xs text-primary underline">All messages →</Link>
          </div>
        </GamePanel>
      </div>
    </GameShell>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: "primary" | "secondary" | "accent" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{Math.round(value)}</span>
      </div>
      <div className="mt-1"><Bar value={value} color={color} /></div>
    </div>
  );
}
