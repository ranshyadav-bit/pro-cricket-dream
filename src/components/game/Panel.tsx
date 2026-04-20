import type { ReactNode } from "react";

export function GamePanel({
  title,
  subtitle,
  children,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
      {(title || action) && (
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-display text-lg text-foreground">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"} p-3`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-display text-xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Bar({ value, max = 100, color = "primary" }: { value: number; max?: number; color?: "primary" | "secondary" | "accent" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cls = color === "secondary" ? "bg-secondary" : color === "accent" ? "bg-accent" : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
