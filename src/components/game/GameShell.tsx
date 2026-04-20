import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { hasSave, loadSave } from "@/game/storage";
import { overallRating } from "@/game/rating";

const NAV = [
  { to: "/hub", label: "Hub" },
  { to: "/training", label: "Training" },
  { to: "/fixtures", label: "Fixtures" },
  { to: "/stats", label: "Stats" },
  { to: "/inbox", label: "Inbox" },
] as const;

export function GameShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Re-read save on every navigation so header reflects latest state
  useEffect(() => {
    setTick((t) => t + 1);
  }, [location.pathname]);

  const save = typeof window !== "undefined" ? loadSave() : null;
  void tick; // include in deps

  // If no save and user lands on a protected page, send them home
  useEffect(() => {
    const protectedRoutes = ["/hub", "/training", "/fixtures", "/stats", "/inbox", "/match"];
    if (protectedRoutes.includes(location.pathname) && !hasSave()) {
      navigate({ to: "/" });
    }
  }, [location.pathname, navigate]);

  if (!save) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  if (save.player.retired) {
    // Redirect once on first render after retirement
    if (location.pathname !== "/career-end" && location.pathname !== "/") {
      navigate({ to: "/career-end" });
    }
  }

  const rating = overallRating(save.player);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/hub" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-primary shadow-glow" />
            <div className="leading-tight">
              <p className="text-display text-sm">{save.player.name}</p>
              <p className="text-xs text-muted-foreground">
                {save.player.team} · {save.player.role}
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            {NAV.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`text-display text-xs uppercase tracking-wider transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <div className="ml-3 flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">OVR</span>
              <span className="text-display text-base text-primary">{rating}</span>
              <span className="text-muted-foreground">Age</span>
              <span className="text-display text-sm">{Math.floor(save.player.age)}</span>
              <span className="text-muted-foreground">Yr</span>
              <span className="text-display text-sm">{save.year}·W{save.week}</span>
            </div>
          </div>
          <button
            className="rounded-md border border-border px-3 py-1 text-xs md:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-card md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="py-2 text-muted-foreground hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">OVR</span>
                <span className="text-display text-base text-primary">{rating}</span>
                <span className="text-muted-foreground">Age {Math.floor(save.player.age)}</span>
                <span className="text-muted-foreground">{save.year} · W{save.week}</span>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
