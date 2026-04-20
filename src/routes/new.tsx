import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { newCareer } from "@/game/factory";
import { writeSave } from "@/game/storage";
import type { Nation, Role } from "@/game/types";

export const Route = createFileRoute("/new")({
  component: NewCareer,
});

const NATIONS: Nation[] = [
  "Australia", "England", "India", "Pakistan", "South Africa",
  "New Zealand", "West Indies", "Sri Lanka", "Bangladesh",
];

const ROLES: { role: Role; tag: string; desc: string }[] = [
  { role: "Top-Order Bat",       tag: "BAT", desc: "Anchor the innings. Strong timing & technique." },
  { role: "Middle-Order Bat",    tag: "BAT", desc: "Build & accelerate. Balanced batting profile." },
  { role: "Finisher",            tag: "BAT", desc: "Death overs specialist. Power-hitting focus." },
  { role: "Wicket-Keeper Bat",   tag: "WK",  desc: "Behind the stumps + scoring runs." },
  { role: "All-Rounder",         tag: "AR",  desc: "Bat and bowl. Flexible, slow to peak." },
  { role: "Pace Bowler",         tag: "BWL", desc: "Raw pace. Bouncers & yorkers." },
  { role: "Swing Bowler",        tag: "BWL", desc: "New-ball specialist. Movement off the seam." },
  { role: "Off-Spinner",         tag: "BWL", desc: "Right-arm off-break. Patience & accuracy." },
  { role: "Leg-Spinner",         tag: "BWL", desc: "Mystery & variation. Wicket-taker." },
];

function NewCareer() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nation, setNation] = useState<Nation>("Australia");
  const [role, setRole] = useState<Role>("Top-Order Bat");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const canStart = name.trim().length >= 2;

  const start = () => {
    if (!canStart) return;
    const save = newCareer({ name: name.trim(), nation, role });
    writeSave(save);
    navigate({ to: "/hub" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-6 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>

        <h1 className="text-display text-3xl text-foreground">Create Your Player</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step} of 3 · You'll start at age 17 in club cricket.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-elegant">
          {step === 1 && (
            <>
              <label className="text-display text-xs text-primary">1 — Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sam Patel"
                maxLength={40}
                className="mt-3 w-full rounded-md border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
                autoFocus
              />
              <button
                disabled={!canStart}
                onClick={() => setStep(2)}
                className="mt-6 w-full rounded-md bg-gradient-primary py-3 text-display text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <label className="text-display text-xs text-primary">2 — Choose Your Nation</label>
              <p className="mt-1 text-xs text-muted-foreground">Determines your domestic pathway.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {NATIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNation(n)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      nation === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-display text-sm">{n}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-md border border-border py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-2 flex-1 rounded-md bg-gradient-primary py-3 text-display text-sm text-primary-foreground"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <label className="text-display text-xs text-primary">3 — Pick Your Role</label>
              <p className="mt-1 text-xs text-muted-foreground">Drives your starting attributes.</p>
              <div className="mt-4 space-y-2">
                {ROLES.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => setRole(r.role)}
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      role === r.role
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background/40 hover:border-primary/40"
                    }`}
                  >
                    <span className={`mt-0.5 inline-flex h-7 w-10 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                      r.tag === "BAT" ? "bg-primary/20 text-primary"
                        : r.tag === "BWL" ? "bg-accent/20 text-accent"
                        : r.tag === "WK" ? "bg-secondary/30 text-secondary"
                        : "bg-muted text-foreground"
                    }`}>{r.tag}</span>
                    <div className="min-w-0">
                      <p className={`text-display text-sm ${role === r.role ? "text-primary" : "text-foreground"}`}>{r.role}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-md border border-border py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={start}
                  className="flex-1 rounded-md bg-gradient-primary py-3 text-display text-sm text-primary-foreground shadow-glow"
                >
                  Begin Career →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
