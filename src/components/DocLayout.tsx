import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";

const sections = [
  { to: "/", label: "01 — Overview", short: "Overview" },
  { to: "/player-creation", label: "02 — Player Creation", short: "Creation" },
  { to: "/progression", label: "03 — Progression & Skills", short: "Progression" },
  { to: "/leagues", label: "04 — Leagues & Calendar", short: "Leagues" },
  { to: "/dynamics", label: "05 — Career Dynamics", short: "Dynamics" },
  { to: "/mechanics", label: "06 — Game Mechanics", short: "Mechanics" },
  { to: "/simulation", label: "07 — Simulation Mode", short: "Simulation" },
  { to: "/ui", label: "08 — UI & Player Hub", short: "UI" },
  { to: "/tech-stack", label: "09 — Tech Stack", short: "Tech" },
] as const;

export function DocLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-primary shadow-glow" />
          <span className="text-display text-sm">Pro Cricket Career 26</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-border px-3 py-1 text-xs"
          aria-label="Toggle navigation"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside
          className={`${
            open ? "block" : "hidden"
          } lg:block fixed inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-border bg-card/40 backdrop-blur lg:sticky lg:top-0 lg:h-screen`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border p-6">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-primary shadow-glow" />
                <div>
                  <p className="text-display text-base leading-tight">Pro Cricket</p>
                  <p className="text-display text-base leading-tight text-primary">Career 26</p>
                </div>
              </Link>
              <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                Technical Design Document · v0.1
              </p>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {sections.map((s) => {
                const active = location.pathname === s.to;
                return (
                  <Link
                    key={s.to}
                    to={s.to}
                    onClick={() => setOpen(false)}
                    className={`group block rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-display text-xs">{s.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                Inspired by Cricket 24/26 career mode. Internal design spec — not affiliated with Big Ant Studios.
              </p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
