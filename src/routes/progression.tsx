import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/progression")({
  component: ProgressionPage,
});

const skills = [
  {
    group: "Batting",
    items: [
      "Timing", "Footwork", "Front-Foot Defense", "Back-Foot Defense",
      "Drive (Cover/Straight/On)", "Pull / Hook", "Cut", "Sweep / Reverse",
      "Late Cut", "Lofted Shots", "Running Between Wickets", "Concentration",
    ],
  },
  {
    group: "Bowling",
    items: [
      "Pace", "Accuracy (Line)", "Accuracy (Length)", "Swing (Conv/Reverse)",
      "Seam Movement", "Off-Spin / Leg-Spin", "Doosra / Carrom", "Yorker",
      "Slower Ball", "Bouncer", "Stamina", "Pressure under Death Overs",
    ],
  },
  {
    group: "Fielding",
    items: [
      "Catching (Slip/Outfield)", "Throwing Arm", "Ground Fielding",
      "Diving Range", "Wicket-Keeping (Stumping/Glove-work)",
    ],
  },
  {
    group: "Mental & Physical",
    items: ["Confidence", "Composure", "Fitness", "Injury Resistance", "Captaincy IQ"],
  },
];

function ProgressionPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="03 — Progression"
        title="Skill Trees, Training & Levelling"
        lead="Skills improve through intentional training, match performance, and milestone unlocks. The path from 55 to 90+ overall is designed to take ~8–12 in-game seasons."
      />

      <Section title="Skill Categories">
        <Grid cols={2}>
          {skills.map((s) => (
            <Card key={s.group} title={s.group}>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {s.items.map((i) => (
                  <li key={i} className="text-muted-foreground">• {i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section title="Training System">
        <p>
          Each week the player has an <span className="text-foreground">Energy Pool (100)</span>{" "}
          to spend across drill cards. Drills come in three intensities:
        </p>
        <Grid cols={3}>
          <Card title="Light (5 energy)" accent="secondary">
            Small XP gain, no fatigue, low injury risk. Good in match weeks.
          </Card>
          <Card title="Standard (15 energy)" accent="primary">
            Normal XP, moderate fatigue, baseline injury risk. The default block.
          </Card>
          <Card title="Intense (30 energy)" accent="accent">
            High XP, heavy fatigue, raised injury risk. Best in off-season.
          </Card>
        </Grid>
        <p>
          XP gains are capped per skill per week to prevent grinding. Coaches unlock{" "}
          <span className="text-foreground">specialist drills</span> (e.g. Reverse Swing Lab,
          Spin vs Sweep, Death Overs Yorker Camp) once relationship + reputation thresholds
          are met.
        </p>
      </Section>

      <Section title="Rating Curve">
        <Grid cols={4}>
          <Card title="55 → 65">Domestic regular. 1–2 seasons.</Card>
          <Card title="65 → 75">National A / fringe call-ups. 2–3 seasons.</Card>
          <Card title="75 → 85">Established international. 3–4 seasons.</Card>
          <Card title="85 → 92+">World-class. Form-locked, perks active.</Card>
        </Grid>
        <p>
          Hidden <span className="text-foreground">Potential Rating</span> caps the maximum
          attainable overall. Players can exceed it by ~2 points during peak form windows.
        </p>
      </Section>

      <Section title="Player Development Plan (PDP)">
        <p>
          Each season the coach proposes a <span className="text-foreground">PDP</span> tailored
          to role: 3 focus skills, 1 weakness to patch, 1 stretch goal (e.g. &quot;score a
          first-class double-century&quot;). Completing the PDP grants bonus XP, contract value,
          and a perk slot.
        </p>
      </Section>

      <Section title="Perks (unlocked at milestones)">
        <Grid cols={3}>
          <Card title="Ice Veins">+10 confidence in last 5 overs of a chase.</Card>
          <Card title="New Ball Specialist">Swing decay 25% slower for first 10 overs.</Card>
          <Card title="Pitch Reader">Sees pitch wear / behavior tooltips earlier.</Card>
          <Card title="Marathon Man">+20% stamina recovery between spells.</Card>
          <Card title="Big Match Player">Confidence resets to 70 for finals/internationals.</Card>
          <Card title="Glove Magnet">Wicket-keeper catch reaction window +15%.</Card>
        </Grid>
      </Section>
    </DocLayout>
  );
}
