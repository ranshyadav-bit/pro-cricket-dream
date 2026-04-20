import { createFileRoute } from "@tanstack/react-router";
import { DocLayout } from "@/components/DocLayout";
import { Card, Grid, PageHeader, Section } from "@/components/doc/Section";

export const Route = createFileRoute("/leagues")({
  component: LeaguesPage,
});

const leagues = [
  { name: "Indian Premier League", code: "IPL", window: "Mar – May", teams: 10, format: "T20", tier: "S" },
  { name: "Pakistan Super League", code: "PSL", window: "Feb – Mar", teams: 6, format: "T20", tier: "A" },
  { name: "Big Bash League", code: "BBL", window: "Dec – Jan", teams: 8, format: "T20", tier: "A" },
  { name: "The Hundred", code: "T100", window: "Jul – Aug", teams: 8, format: "100-ball", tier: "A" },
  { name: "Caribbean Premier League", code: "CPL", window: "Aug – Sep", teams: 6, format: "T20", tier: "B" },
  { name: "SA20", code: "SA20", window: "Jan – Feb", teams: 6, format: "T20", tier: "B" },
  { name: "Major League Cricket", code: "MLC", window: "Jul", teams: 6, format: "T20", tier: "B" },
  { name: "ILT20 (UAE)", code: "ILT20", window: "Jan – Feb", teams: 6, format: "T20", tier: "C" },
];

const internationals = [
  { name: "ICC World Test Championship", format: "Test", cycle: "2 yrs" },
  { name: "ICC Cricket World Cup", format: "ODI", cycle: "4 yrs" },
  { name: "ICC T20 World Cup", format: "T20I", cycle: "2 yrs" },
  { name: "Champions Trophy", format: "ODI", cycle: "4 yrs" },
  { name: "Bilateral Tours", format: "Test/ODI/T20I", cycle: "Year-round" },
  { name: "Asia Cup", format: "Rotates", cycle: "2 yrs" },
];

function LeaguesPage() {
  return (
    <DocLayout>
      <PageHeader
        eyebrow="04 — Leagues & Calendar"
        title="The Global Cricket Calendar"
        lead="A single, simulated, year-round calendar that resolves every fixture in the world — whether the player participates, simulates, or watches."
      />

      <Section title="Franchise Leagues (auctioned)">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-card text-left">
              <tr>
                <th className="px-4 py-3 text-display text-xs">League</th>
                <th className="px-4 py-3 text-display text-xs">Code</th>
                <th className="px-4 py-3 text-display text-xs">Window</th>
                <th className="px-4 py-3 text-display text-xs">Teams</th>
                <th className="px-4 py-3 text-display text-xs">Format</th>
                <th className="px-4 py-3 text-display text-xs">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card/40">
              {leagues.map((l) => (
                <tr key={l.code}>
                  <td className="px-4 py-3 text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-primary">{l.code}</td>
                  <td className="px-4 py-3">{l.window}</td>
                  <td className="px-4 py-3">{l.teams}</td>
                  <td className="px-4 py-3">{l.format}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {l.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Auction & Contract System">
        <Grid cols={2}>
          <Card title="Base Price Tiers" accent="primary">
            Player sets a base price per league: $20k → $2M USD equivalent. Higher base =
            fewer bids but bigger contracts when picked.
          </Card>
          <Card title="Auction Simulation" accent="secondary">
            Live, animated mini-event with team purses, RTM cards, and bidding wars. Form,
            recent stats, and marketability drive AI bid behavior.
          </Card>
          <Card title="Marquee Status">
            Reach 85+ rating + 2 league titles to qualify for marquee slots, unlocking
            multi-season contracts and equity offers.
          </Card>
          <Card title="Contract Negotiation">
            Beyond price: appearance fees, image rights split, no-trade clauses, opt-outs,
            performance bonuses (POTM, SR, ER, milestones).
          </Card>
        </Grid>
      </Section>

      <Section title="International Calendar">
        <Grid cols={3}>
          {internationals.map((t) => (
            <Card key={t.name} title={t.name}>
              <p>Format: {t.format}</p>
              <p>Cycle: {t.cycle}</p>
            </Card>
          ))}
        </Grid>
        <p>
          Bilateral tours auto-generate based on FTP-style logic. The player&apos;s national
          board issues <span className="text-foreground">central contracts</span> in 4 grades
          (A+, A, B, C), each with retainers and minimum fixture commitments.
        </p>
      </Section>

      <Section title="Conflict Resolution">
        <p>
          When a franchise league overlaps with an international tour, the player chooses —
          but with consequences:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><span className="text-foreground">Pick country</span>: +reputation, +board favor, lose league fee.</li>
          <li><span className="text-foreground">Pick league</span>: +money, -board favor, possible NOC denial next cycle.</li>
          <li><span className="text-foreground">Force NOC denial</span>: triggers media event &amp; fan-sentiment shift.</li>
        </ul>
      </Section>
    </DocLayout>
  );
}
