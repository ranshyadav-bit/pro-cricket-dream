import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="border-b border-border bg-card/30 px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
      <p className="text-display text-xs text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
      {lead ? (
        <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">{lead}</p>
      ) : null}
    </header>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-b border-border px-6 py-10 sm:px-10 lg:px-16">
      <h2 className="text-display text-2xl text-foreground sm:text-3xl">{title}</h2>
      <div className="mt-6 max-w-4xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function Card({
  title,
  children,
  accent,
}: {
  title: string;
  children: ReactNode;
  accent?: "primary" | "secondary" | "accent";
}) {
  const ring =
    accent === "secondary"
      ? "ring-secondary/40"
      : accent === "accent"
        ? "ring-accent/40"
        : "ring-primary/40";
  return (
    <div className={`rounded-lg border border-border bg-card p-5 shadow-elegant ring-1 ${ring}`}>
      <h3 className="text-display text-sm text-foreground">{title}</h3>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";
  return <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-display text-2xl text-primary">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
      {children}
    </span>
  );
}

export function KeyValue({ items }: { items: Array<{ k: string; v: string }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.k} className="flex items-baseline justify-between border-b border-border/60 pb-2">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{i.k}</dt>
          <dd className="text-sm font-medium text-foreground">{i.v}</dd>
        </div>
      ))}
    </dl>
  );
}
