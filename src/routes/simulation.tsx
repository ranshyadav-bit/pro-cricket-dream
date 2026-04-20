import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/simulation")({
  command: undefined as never,
  component: SimulationPage,
} as never);

function SimulationPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="07 — Simulation"
        title="Sim Days, Sim Matches, Live Career"
        lead="Players control their workload. Skip a county fixture, sim to the IPL final, or watch a key passage of play live — career stats stay coherent across all paths."
      />

      <Section title="Three Simulation Granularities">
        <Grid cols={3}>
          <Card title="Sim to Next Event" accent="primary">
            Auto-advance days/weeks until the next decision: contract, training, key match,
            cap ceremony. Resolves all calendar fixtures in the background.
          </Card>
          <Card title="Sim Whole Match" accent="secondary">
            Match resolved by the simulation engine using player skill, form, opposition,
            conditions, role, and a randomness seed. Returns full scorecard + your own
            individual stat line.
          </Card>
          <Card title="Sim Innings / Session" accent="accent">
            Step-in simulation: sim an over, a session, or until your turn to bat / bowl.
            Combines live play with fast-forward.
          </Card>
        </Grid>
      </Section>

      <Section title="Sim Engine Inputs">
        <ul className="ml-5 list-disc space-y-2">
          <li>Player skills (per attribute) vs opposition skill matrix.</li>
          <li>Form (last 5 matches) and confidence going in.</li>
          <li>Role brief alignment (anchor vs aggressor, etc.).</li>
          <li>Conditions: pitch, weather, ground dimensions.</li>
          <li>Fatigue &amp; injury status.</li>
          <li>Opposition strategy AI (defensive fields, target bowler, etc.).</li>
        </ul>
      </Section>

      <Section title="Stat Coherence Rules">
        <p>
          Whether the user plays or sims, the engine writes to the same stats schema. Rules
          to keep simmed careers feeling earned:
        </p>
        <Grid cols={2}>
          <Card title="No Free Numbers">
            Sim output is sampled from a distribution centered on the player&apos;s skill —
            not a flat &quot;you played well&quot; bonus.
          </Card>
          <Card title="Form Memory">
            Simmed bad innings still tank confidence. You can&apos;t sim through a slump.
          </Card>
          <Card title="Injury Honesty" accent="accent">
            Fast bowlers carrying load WILL get injured during sim — same risk model as live
            matches.
          </Card>
          <Card title="Highlight Replay">
            For simmed milestones (50, 100, 5-fer), the game offers a 30-second replay
            cutscene the user can watch or skip.
          </Card>
        </Grid>
      </Section>

      <Section title="Live-Sim Toggle">
        <p>
          During any live match, a hold-button shortcut opens the Sim panel: sim this over,
          sim to drinks, sim to next wicket, sim rest of innings. The user can dip in and out
          of live play across a single match.
        </p>
      </Section>
    </DocLayout>
  );
}
