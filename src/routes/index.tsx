import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-stadium.jpg";
import { hasSave, deleteSave, loadSave } from "@/game/storage";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [savedExists, setSavedExists] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    setSavedExists(hasSave());
    const s = loadSave();
    if (s) setPlayerName(s.player.name);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <img
        src={heroImg}
        alt="Floodlit cricket stadium"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-hero" />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
        <p className="text-display text-xs text-primary">Pro Cricket Career 26</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
          Bat. Bowl. <span className="text-primary">Become a Legend.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Start as a 17-year-old club nobody. Train, grind, and choose your shots one ball at a
          time across a 15-year cricket career — domestic, franchise T20, and international.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate({ to: "/new" })}
            className="rounded-md bg-gradient-primary px-6 py-3 text-display text-sm text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            New Career
          </button>
          {savedExists && (
            <button
              onClick={() => navigate({ to: "/hub" })}
              className="rounded-md border border-border bg-card px-6 py-3 text-display text-sm text-foreground hover:bg-card/80"
            >
              Continue {playerName ? `as ${playerName}` : ""}
            </button>
          )}
          {savedExists && (
            <button
              onClick={() => {
                if (confirm("Delete saved career? This cannot be undone.")) {
                  deleteSave();
                  setSavedExists(false);
                  setPlayerName(null);
                }
              }}
              className="rounded-md border border-destructive/40 px-6 py-3 text-xs text-destructive hover:bg-destructive/10"
            >
              Delete Save
            </button>
          )}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Choose your shot", v: "Per ball" },
            { k: "Career length", v: "17 → 35+" },
            { k: "Leagues", v: "T20 · ODI · Test" },
            { k: "Save", v: "On this device" },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</p>
              <p className="text-display text-base text-primary">{s.v}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Inspired by Big Ant Cricket 24/26 career mode and CricketDirector.com.{" "}
          <Link to="/" className="underline">A passion project</Link>.
        </p>
      </div>
    </div>
  );
}
