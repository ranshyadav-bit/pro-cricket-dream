import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/mechanics")({
  component: MechanicsPage,
});

function MechanicsPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="06 — Game Mechanics"
        title="Authentic, Punishing, Rewarding"
        lead="The on-field model rewards good shot selection, footwork timing, and respect for the conditions. Slogging gets you out. Building gets you a hundred."
      />

      <Section title="Batting Model">
        <Grid cols={2}>
          <Card title="Shot Stick + Foot Modifier" accent="primary">
            Right stick = shot direction &amp; intent; LT/L2 = front foot, RT/R2 = back foot.
            No modifier = defensive intent. Hold = aggressive.
          </Card>
          <Card title="Timing Window" accent="secondary">
            Three timing zones — Early, Ideal, Late — visualised by a delayed reaction blur on
            higher difficulties (no UI bar in Pro / Legend modes).
          </Card>
          <Card title="Foot Placement">
            Player must commit footwork before release. Wrong commitment vs swing/spin =
            edge, LBW shout, or beat-the-bat.
          </Card>
          <Card title="Shot Discipline">
            Each ball has an &quot;ideal response&quot; from the server (leave / defend / rotate /
            attack). Matching it banks confidence; mismatching drains it.
          </Card>
        </Grid>
      </Section>

      <Section title="Bowling Model">
        <Grid cols={2}>
          <Card title="Run-Up Rhythm" accent="primary">
            Hold-and-release rhythm meter at top of run-up. Bad rhythm = no-ball risk &amp;
            accuracy penalty.
          </Card>
          <Card title="Length & Line Targeting" accent="secondary">
            Two-stage stick aim: line first, then length. Wind, dew, pitch wear shift the
            actual landing zone slightly from the marker.
          </Card>
          <Card title="Variations">
            Cutters, slower balls, knuckle ball, yorkers, bouncers — gated by skill thresholds
            and confidence to attempt cleanly.
          </Card>
          <Card title="Spell Management">
            Stamina meter per bowler. Going past 70% fatigue causes pace drop, accuracy drift,
            and injury risk spike.
          </Card>
        </Grid>
      </Section>

      <Section title="Conditions Engine">
        <ul className="ml-5 list-disc space-y-2">
          <li><span className="text-foreground">Pitch type</span>: green, dry, dustbowl, used, drop-in. Affects pace, bounce, turn.</li>
          <li><span className="text-foreground">Pitch wear</span>: tracked per session, with rough patches outside off-stump for spinners.</li>
          <li><span className="text-foreground">Weather</span>: cloud cover boosts swing; humidity boosts reverse; dew kills grip in 2nd innings.</li>
          <li><span className="text-foreground">Ball state</span>: shine, scuff, softness — drives swing/seam decay.</li>
          <li><span className="text-foreground">Day/Night</span>: pink ball model with twilight visibility window.</li>
        </ul>
      </Section>

      <Section title="Confidence System">
        <p>
          Every batter and bowler tracks a hidden 0–100 <span className="text-foreground">Confidence</span>
          value per match, modulated by recent balls:
        </p>
        <Grid cols={3}>
          <Card title="Low (0–35)" accent="accent">
            Animations look tentative. Timing windows shrink. Aggressive shots blocked unless
            held longer.
          </Card>
          <Card title="Steady (36–75)">
            Standard play. Most shots and deliveries available.
          </Card>
          <Card title="In-Form (76–100)" accent="primary">
            Bigger timing window. &quot;Purple patch&quot; visual tint. Premium shots unlock
            (helicopter, ramp, switch-hit).
          </Card>
        </Grid>
      </Section>

      <Section title="Difficulty Tiers">
        <Grid cols={4}>
          <Card title="Amateur">UI helpers on. Wider timing. AI conservative.</Card>
          <Card title="Pro">Default. Realistic timing. AI tactical.</Card>
          <Card title="Veteran">No batting cone. AI sets traps.</Card>
          <Card title="Legend">No HUD aim. Hidden line/length. Full sim.</Card>
        </Grid>
      </Section>
    </DocLayout>
  );
}
