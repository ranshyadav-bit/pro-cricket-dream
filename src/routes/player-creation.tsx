import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, KeyValue, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/player-creation")({
  component: PlayerCreationPage,
});

function PlayerCreationPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="02 — Player Creation"
        title="Create-A-Pro & Debut"
        lead="The career begins in a creator suite that defines look, role, and origin story. The first match is in dusty local club whites — not a stadium."
      />

      <Section title="Player Creator Modules">
        <Grid cols={3}>
          <Card title="Face Sculpt">
            Photo-import or manual sculpt with 80+ morph sliders: skull width, jaw, cheekbones,
            nose bridge, eye spacing, brow density, lip thickness. Skin tone &amp; freckle layers.
          </Card>
          <Card title="Hair & Grooming">
            40+ hair styles, beard / stubble system, dye colors, headband &amp; cap presets.
            Hair re-grows / can be cut between seasons.
          </Card>
          <Card title="Body Type">
            Height (160–205cm), weight, muscle mass, body-fat slider. Affects animation rig:
            tall fast bowlers get steeper bounce, shorter players have lower center of gravity.
          </Card>
          <Card title="Equipment">
            Bat sticker brand, pad style, gloves, helmet grill type, spike pattern. Sponsorship
            slots unlock as career grows.
          </Card>
          <Card title="Origin & Nation">
            Choose home nation (AUS / ENG / IND / PAK / SA / NZ / WI / SL / BAN / AFG / IRE).
            Sets eligible domestic competition and U19 pathway.
          </Card>
          <Card title="Role Selection">
            Top-Order Bat, Middle-Order, Finisher, Wicket-Keeper, All-Rounder, Pace Bowler,
            Swing Bowler, Off-Spin, Leg-Spin, Mystery Spinner. Drives starting skill spread.
          </Card>
        </Grid>
      </Section>

      <Section title="Starting Profile">
        <KeyValue
          items={[
            { k: "Age", v: "17" },
            { k: "Overall Rating", v: "50–60" },
            { k: "Potential (hidden)", v: "65–95" },
            { k: "Starting Tier", v: "Local Club / 2nd XI" },
            { k: "Contract", v: "Match-fee only" },
            { k: "Coach Opinion", v: "Unproven" },
            { k: "Fitness", v: "70 (untrained pro)" },
            { k: "Confidence", v: "50 (neutral)" },
          ]}
        />
      </Section>

      <Section title="Pathway to a Domestic Team">
        <p>
          The player begins in a fictional local club league (e.g. Sydney Grade Cricket, English
          Premier Leagues, Ranji feeder leagues). Performance triggers scouting events:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>50+ runs in a club innings → state/county scout attends next match.</li>
          <li>3-wicket haul → bowling coach invitation to academy net session.</li>
          <li>Consistent form over a month → trial offer from a domestic franchise.</li>
          <li>Trial match cutscene → contract offer (Rookie / Development / Senior).</li>
        </ul>
        <p>
          Domestic competitions modeled: Sheffield Shield + Marsh Cup + BBL pathway (AUS),
          County Championship + Vitality Blast (ENG), Ranji + SMA + Vijay Hazare (IND),
          Quaid-e-Azam + PSL feeder (PAK), CSA 4-Day (SA), Plunket Shield (NZ).
        </p>
      </Section>
    </DocLayout>
  );
}
