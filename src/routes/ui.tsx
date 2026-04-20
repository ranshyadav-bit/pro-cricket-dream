import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/ui")({
  component: UIPage,
});

function UIPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="08 — UI"
        title="Player Hub & Career Screens"
        lead="The UI is built around five anchor screens. Everything else is a modal, slide-out, or in-match overlay."
      />

      <Section title="Anchor Screens">
        <Grid cols={2}>
          <Card title="Player Hub (home)" accent="primary">
            Headline card with avatar, role, overall, form arrow. Tiles for: Next Fixture,
            Training, Inbox, Contracts, Sponsors, Awards.
          </Card>
          <Card title="Calendar" accent="secondary">
            Year-view scrolling timeline. Color bands per competition (international,
            domestic, franchise). Click a date → day card with all simmed events.
          </Card>
          <Card title="Team Management">
            View squad, opposition scouting, role within XI, captain&apos;s plan, suggested
            fields. Captains get full XI control.
          </Card>
          <Card title="Contracts & Auctions" accent="accent">
            Active contracts list, expiring soon, upcoming auctions, base price slider, offer
            inbox with negotiation dialogue.
          </Card>
          <Card title="Stats & Records">
            Career stats by format, by competition, by season. Records vs ICC bench.
            Hall-of-fame milestone tracker.
          </Card>
          <Card title="Skills & Training">
            Skill trees, weekly drill planner, energy bar, PDP progress, perk slots.
          </Card>
        </Grid>
      </Section>

      <Section title="In-Match HUD">
        <ul className="ml-5 list-disc space-y-2">
          <li>Score, overs, RR / RRR, partnership, batter mini-cards.</li>
          <li>Confidence + form indicator (colored aura on player nameplate).</li>
          <li>Field map toggle (D-pad up).</li>
          <li>Captain plan tab (D-pad right).</li>
          <li>Sim panel (hold Start) with live-sim options.</li>
        </ul>
      </Section>

      <Section title="Inbox & Notifications">
        <p>
          A unified inbox surfaces: scout reports, coach feedback, sponsor offers, auction
          results, board emails, fan mail. Categorized, filterable, and persistent across
          seasons.
        </p>
      </Section>

      <Section title="Accessibility">
        <Grid cols={2}>
          <Card title="Visual">High-contrast HUD, colorblind palette options, scalable fonts, optional shot-zone outline.</Card>
          <Card title="Input">Remappable bindings, hold-to-toggle, button-mash alternatives, simplified shot stick.</Card>
          <Card title="Cognitive">Optional tooltips, slow-mo training mode, decision &quot;rewind one ball&quot; on Amateur.</Card>
          <Card title="Audio">Subtitle styling, separate sliders for crowd / commentary / on-field SFX.</Card>
        </Grid>
      </Section>
    </DocLayout>
  );
}
