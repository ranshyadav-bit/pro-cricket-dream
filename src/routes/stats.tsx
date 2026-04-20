import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel, StatBox } from "@/components/game/Panel";
import { loadSave } from "@/game/storage";
import { battingAverage, bowlingAverage, economy, strikeRate } from "@/game/career";
import type { SaveGame } from "@/game/types";

export const Route = createFileRoute("/stats")({
  component: Stats,
});

function Stats() {
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
      <h1 className="mb-4 text-display text-2xl">Career Stats</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GamePanel title="Batting · Career">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatBox label="Innings" value={save.stats.innings} />
            <StatBox label="Runs" value={save.stats.runs} accent />
            <StatBox label="HS" value={save.stats.highestScore} />
            <StatBox label="Average" value={battingAverage(save.stats)} />
            <StatBox label="Strike Rate" value={strikeRate(save.stats)} />
            <StatBox label="Not Out" value={save.stats.notOuts} />
            <StatBox label="Fifties" value={save.stats.fifties} />
            <StatBox label="Hundreds" value={save.stats.hundreds} />
            <StatBox label="4s / 6s" value={`${save.stats.fours} / ${save.stats.sixes}`} />
          </div>
        </GamePanel>
        <GamePanel title="Bowling · Career">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatBox label="Wickets" value={save.stats.wickets} accent />
            <StatBox label="Overs" value={save.stats.oversBowled.toFixed(1)} />
            <StatBox label="Runs Conc." value={save.stats.runsConceded} />
            <StatBox label="Average" value={bowlingAverage(save.stats)} />
            <StatBox label="Economy" value={economy(save.stats)} />
            <StatBox label="5-fors" value={save.stats.fiveFors} />
            <StatBox label="Best" value={`${save.stats.bestBowlingWickets}/${save.stats.bestBowlingRuns}`} />
            <StatBox label="Catches" value={save.stats.catches} />
            <StatBox label="MoM" value={save.stats.manOfMatch} />
          </div>
        </GamePanel>
      </div>

      <div className="mt-4">
        <GamePanel title="This Season">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="Matches" value={save.seasonStats.matches} />
            <StatBox label="Runs" value={save.seasonStats.runs} />
            <StatBox label="Avg" value={battingAverage(save.seasonStats)} />
            <StatBox label="SR" value={strikeRate(save.seasonStats)} />
            <StatBox label="Wickets" value={save.seasonStats.wickets} />
            <StatBox label="Bowl Avg" value={bowlingAverage(save.seasonStats)} />
            <StatBox label="Econ" value={economy(save.seasonStats)} />
            <StatBox label="MoM" value={save.seasonStats.manOfMatch} />
          </div>
        </GamePanel>
      </div>

      <div className="mt-4">
        <GamePanel title="Skill Profile">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(save.player.skills).map(([k, v]) => (
              <StatBox key={k} label={k} value={Math.round(v)} sub={`/${Math.min(99, save.player.potential + 2)}`} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Hidden potential cap: {save.player.potential}. Reach it via training and matches.
          </p>
        </GamePanel>
      </div>
    </GameShell>
  );
}
