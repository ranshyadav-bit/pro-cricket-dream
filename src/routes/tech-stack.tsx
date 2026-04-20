import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, KeyValue, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/tech-stack")({
  component: TechPage,
});

function TechPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="09 — Tech"
        title="Engine, Data & Production"
        lead="Target platforms, engine choices, and the data systems that make a 15-year career feel alive."
      />

      <Section title="Target Platforms">
        <KeyValue
          items={[
            { k: "PC", v: "Windows 10/11, Steam + Epic" },
            { k: "PlayStation", v: "PS5 (60fps perf / 30fps quality)" },
            { k: "Xbox", v: "Series X|S" },
            { k: "Nintendo", v: "Switch 2 (sim-only fallback for low frame rates)" },
            { k: "Cloud", v: "GeForce NOW, Xbox Cloud" },
            { k: "Save sync", v: "Cross-progression via account linking" },
          ]}
        />
      </Section>

      <Section title="Engine & Tooling">
        <Grid cols={3}>
          <Card title="Engine" accent="primary">
            Unreal Engine 5.x — Nanite for stadium geometry, Lumen for floodlight scenes,
            Chaos for ball physics, MetaHuman for face creator.
          </Card>
          <Card title="Animation">
            Custom motion-matched animation set, ~6,000 cricket-specific clips. Mocap of pro
            players for batting / bowling actions.
          </Card>
          <Card title="Ball Physics">
            Custom 6DOF ball model with seam orientation, surface friction, Magnus effect.
            Deterministic given seed for replay.
          </Card>
        </Grid>
      </Section>

      <Section title="Data Architecture">
        <Grid cols={2}>
          <Card title="Career Save">
            Single JSON-backed binary save (~2–4 MB). Versioned schema with migration script
            on patch. Cloud-synced.
          </Card>
          <Card title="World Sim Schema">
            Tables for: leagues, seasons, fixtures, results, ball-by-ball, players (real +
            generated), squads, contracts, sponsors, news.
          </Card>
          <Card title="Generated Content">
            Procedural rookies enter the world each season — names, faces, skill spreads — so
            opposition rosters never feel static across 15 in-game years.
          </Card>
          <Card title="Roster Updates">
            Live roster patches via signed manifest delivery. Real player likeness depends on
            licensing; unlicensed teams use generated placeholders.
          </Card>
        </Grid>
      </Section>

      <Section title="Production Milestones">
        <ul className="ml-5 list-disc space-y-2">
          <li><span className="text-foreground">M1 — Vertical Slice</span>: one career path (AUS, fast bowler), one ground, sim engine, training loop.</li>
          <li><span className="text-foreground">M2 — Alpha</span>: all 10 nations, all formats, calendar, contracts, auction, basic UI.</li>
          <li><span className="text-foreground">M3 — Beta</span>: full league set, polish, accessibility, full cinematic suite.</li>
          <li><span className="text-foreground">M4 — Launch</span>: certification, day-one roster, post-launch live-ops plan.</li>
          <li><span className="text-foreground">Post-launch</span>: seasonal roster updates, new league DLCs, women&apos;s cricket career mode expansion.</li>
        </ul>
      </Section>

      <Section title="Open Questions">
        <Grid cols={2}>
          <Card title="Licensing">Which boards/leagues are signable? Plan for placeholder branding for unlicensed entities.</Card>
          <Card title="Online Sync">Should career mode be fully offline? Cloud sim is risky for save integrity.</Card>
          <Card title="Coaching Avatars">Real-likeness coaches or stylised originals? Affects narrative depth.</Card>
          <Card title="Esports Hooks">Optional ranked online career-vs-career mode? Out of scope for v1.</Card>
        </Grid>
      </Section>
    </DocLayout>
  );
}
