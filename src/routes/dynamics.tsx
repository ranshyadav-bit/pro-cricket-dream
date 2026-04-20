import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/dynamics")({
  component: DynamicsPage,
});

function DynamicsPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="05 — Career Dynamics"
        title="The Story Around the Cricket"
        lead="Cap ceremonies, captain conversations, dressing-room chemistry, media cycles, sponsorship pressure, and the long arc toward retirement."
      />

      <Section title="Cap Ceremony (Debut Cutscene)">
        <p>
          Triggered on first international match. A unique scripted scene per nation:
        </p>
        <Grid cols={3}>
          <Card title="Australia">Baggy Green presented by a living legend in a hotel team-room.</Card>
          <Card title="England">Test cap handed at Lord&apos;s Long Room, family in stands.</Card>
          <Card title="India">Cap ceremony at boundary line, anthem cut, slow-mo crowd shot.</Card>
          <Card title="Pakistan">Green cap in dressing room, captain&apos;s speech, dua moment.</Card>
          <Card title="South Africa">Proteas cap with squad lineup walk-through.</Card>
          <Card title="New Zealand">Black cap ceremony with haka-style team huddle.</Card>
        </Grid>
        <p>
          The cap number is permanently associated with the player&apos;s save and shown on the
          jersey collar in all subsequent international matches.
        </p>
      </Section>

      <Section title="Captain & Coach Interactions">
        <Grid cols={2}>
          <Card title="Pre-Match Briefing" accent="primary">
            Captain assigns role: anchor, accelerator, partnership-builder, finisher, new-ball
            spell, death overs, defensive lines. Hitting the brief raises form/confidence;
            ignoring it costs trust.
          </Card>
          <Card title="Mid-Innings Chat" accent="secondary">
            Quick dialogue choices during drinks breaks: stay aggressive, consolidate, target
            a specific bowler. Affects AI batting partner behavior.
          </Card>
          <Card title="Post-Match Review">
            Coach grades performance vs. brief. Three relationship axes: Trust, Discipline,
            Vision. Low scores risk being dropped or benched.
          </Card>
          <Card title="Captaincy Offers">
            Offered at 80+ rating + 5 yrs experience + leadership trait. Adds tactical phase
            (field settings, bowling rotations, DRS calls).
          </Card>
        </Grid>
      </Section>

      <Section title="Dynamic Player Development Plans by Role">
        <Grid cols={2}>
          <Card title="Top-Order Batter">
            Focus on leaving the new ball, V drives, conversion 50→100. PDP weakness usually
            pull shot or sweep vs spin.
          </Card>
          <Card title="Finisher (T20)">
            Lofted hits, range hitting, running between wickets, last-over batting awareness.
          </Card>
          <Card title="Fast Bowler">
            Stamina blocks, yorker accuracy, reverse swing, bouncer plans. Injury management
            is constant.
          </Card>
          <Card title="Mystery Spinner">
            Variation library: doosra, carrom, slider, googly. Confidence required to deploy
            in pressure overs.
          </Card>
          <Card title="Wicket-Keeper Batter">
            Glove-work drills + middle-order batting plan. Doubles workload.
          </Card>
          <Card title="All-Rounder">
            Two PDPs every season (bat + bowl) at half pace each. Hardest path to 90+.
          </Card>
        </Grid>
      </Section>

      <Section title="Media, Sponsors & Off-Field">
        <ul className="ml-5 list-disc space-y-2">
          <li><span className="text-foreground">Press conferences</span> with dialogue choices that shape public sentiment.</li>
          <li><span className="text-foreground">Social media meter</span> tracks fan favorability — affects sponsor offers.</li>
          <li><span className="text-foreground">Sponsorships</span> tier from local kit to global ambassador (bat brand, energy drink, watch).</li>
          <li><span className="text-foreground">Awards night</span> end-of-season cutscene: POTY, Emerging Player, Test XI of Year.</li>
        </ul>
      </Section>

      <Section title="Retirement (Age 35+)">
        <p>
          From age 33, attribute decay accelerates: pace, reflexes, stamina drop 1–3 points
          per season. Trigger conditions for retirement prompt:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Age ≥ 35 and overall rating drops below 75.</li>
          <li>Major injury (Grade 3+) at age 33+.</li>
          <li>National board drops player from central contract two cycles in a row.</li>
          <li>Player-initiated retirement available any time after 30.</li>
        </ul>
        <p>
          Retirement triggers a cinematic farewell match (player chooses format), a hall-of-fame
          stat reel, and a post-career menu (coaching, commentary, IPL franchise mentor).
        </p>
      </Section>
    </DocLayout>
  );
}
