import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import heroImg from "@/assets/hero-stadium.jpg";
import { Card, Grid, PageHeader, Pill, Section, Stat } from "@/components/doc/Section";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <DocLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Floodlit cricket stadium with a batsman walking out to bat"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-hero" />
        <div className="relative px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
          <p className="text-display text-xs text-primary">Technical Design Document</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Pro Cricket Career 26
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A realism-first single-player cricket career experience. From a 17-year-old club
            unknown to a 90+ rated international superstar — a 15-to-20-year story shaped by
            training, contracts, form, and pressure.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill>Realism over arcade</Pill>
            <Pill>Big Ant Cricket 24/26 inspired</Pill>
            <Pill>Single-player career</Pill>
            <Pill>15-year sim window</Pill>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Start age" value="17" sub="Club cricket" />
            <Stat label="Retirement" value="35+" sub="Form & age driven" />
            <Stat label="Start rating" value="50–60" sub="Raw potential" />
            <Stat label="Peak rating" value="90+" sub="Years of grind" />
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="01 — Overview"
        title="Design Goals & Pillars"
        lead="Pro Cricket Career 26 is a long-form, single-player career mode that treats cricket as a craft. Every match has weight; every season has consequences."
      />

      <Section title="Design Pillars">
        <Grid cols={3}>
          <Card title="Authenticity First" accent="primary">
            Defending a tough delivery is a win. Building an innings matters more than swinging
            for boundaries. Pace, swing, spin and pitch wear behave realistically.
          </Card>
          <Card title="A Career, Not a Run" accent="secondary">
            Decisions compound. Choosing County over IPL changes your technique, fitness load,
            sponsorship pool, and selectors&apos; opinions for years.
          </Card>
          <Card title="Living Calendar" accent="accent">
            A simulated global cricket calendar runs whether you play or not — IPL, PSL, BBL,
            CPL, The Hundred, Tests, ODIs, T20Is. The world moves on.
          </Card>
          <Card title="Confidence-Driven Play">
            On-field performance is shaped by hidden confidence, fatigue, and form variables —
            not just stick skill.
          </Card>
          <Card title="Role-Based Identity">
            Top-Order Batter, Finisher, Pace Spearhead, Mystery Spinner, Wicket-keeper Batter,
            All-Rounder — each has tailored training trees and selection logic.
          </Card>
          <Card title="Cinematic Moments">
            Cap ceremonies, milestone cutscenes, captaincy offers, and retirement send-offs
            anchor the emotional arc.
          </Card>
        </Grid>
      </Section>

      <Section title="Career Loop (one season)">
        <ol className="list-decimal space-y-3 pl-5">
          <li><span className="text-foreground">Pre-season:</span> sign contracts, set training plan, choose tour preferences.</li>
          <li><span className="text-foreground">Training week:</span> distribute energy across batting / bowling / fielding / fitness drills.</li>
          <li><span className="text-foreground">Match day:</span> play key matches, simulate filler fixtures, accumulate stats.</li>
          <li><span className="text-foreground">Post-match:</span> press, coach feedback, form &amp; confidence updates.</li>
          <li><span className="text-foreground">Selection windows:</span> domestic → A-side → national call-up → leagues auctioned.</li>
          <li><span className="text-foreground">Off-season:</span> rest, surgery / rehab, sponsorship deals, awards night.</li>
        </ol>
      </Section>
    </DocLayout>
  );
}
