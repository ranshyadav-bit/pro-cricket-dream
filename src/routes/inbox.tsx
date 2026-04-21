import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import type { InboxMessage, SaveGame } from "@/game/types";

export const Route = createFileRoute("/inbox")({
  component: Inbox,
});

function Inbox() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const open = (id: string) => {
    setOpenId(id);
    const next = {
      ...save,
      inbox: save.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
    };
    writeSave(next);
    setSave(next);
  };

  const opened = save.inbox.find((m) => m.id === openId);

  function handleAccept(msg: InboxMessage) {
    if (!msg.offer || !save) return;
    const cur = save;
    const o = msg.offer;
    const earnings = o.basePrice + o.signingBonus;
    const next: SaveGame = {
      ...cur,
      player: {
        ...cur.player,
        team: o.fromTeam,
        tier: o.tier,
        cash: cur.player.cash + earnings,
        morale: Math.min(100, cur.player.morale + 8),
      },
      contractValue: earnings,
      inbox: cur.inbox.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              offer: { ...o, accepted: true },
              body: m.body + `\n\n✓ ACCEPTED. You've signed with ${o.fromTeam}. $${earnings.toLocaleString()}k credited.`,
            }
          : m,
      ),
    };
    writeSave(next);
    setSave(next);
  }

  function handleDecline(msg: InboxMessage) {
    if (!msg.offer || !save) return;
    const cur = save;
    const next: SaveGame = {
      ...cur,
      inbox: cur.inbox.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              offer: { ...m.offer!, declined: true },
              body: m.body + `\n\n✗ DECLINED. ${m.offer!.fromTeam} will look elsewhere.`,
            }
          : m,
      ),
    };
    writeSave(next);
    setSave(next);
  }

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-2">
        <h1 className="text-display text-2xl">Inbox</h1>
        <Link to="/leagues" className="text-xs text-primary underline">World leagues →</Link>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GamePanel>
            <ul className="space-y-2">
              {save.inbox.length === 0 && <li className="text-sm">No messages.</li>}
              {save.inbox.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => open(m.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      openId === m.id
                        ? "border-primary bg-primary/10"
                        : !m.read
                          ? "border-primary/30 bg-primary/5 hover:border-primary/60"
                          : "border-border bg-background/30 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-display text-xs text-foreground">{m.from}</span>
                      <span className="text-[10px] text-muted-foreground">W{m.week}·{m.year}</span>
                    </div>
                    <p className={`mt-1 line-clamp-1 text-sm ${
                      m.type === "milestone" ? "text-primary" : m.type === "contract" ? "text-accent" : "text-foreground"
                    }`}>{m.subject}</p>
                  </button>
                </li>
              ))}
            </ul>
          </GamePanel>
        </div>
        <div className="lg:col-span-2">
          <GamePanel>
            {opened ? (
              <div>
                <p className="text-xs text-muted-foreground">{opened.from} · W{opened.week}·{opened.year}</p>
                <h2 className="mt-1 text-display text-xl text-foreground">{opened.subject}</h2>
                <p className="mt-4 whitespace-pre-line text-sm text-foreground">{opened.body}</p>

                {opened.offer && !opened.offer.accepted && !opened.offer.declined && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleAccept(opened)}
                      className="rounded-md bg-gradient-primary px-5 py-2 text-display text-sm text-primary-foreground shadow-glow"
                    >
                      Accept Offer
                    </button>
                    <button
                      onClick={() => handleDecline(opened)}
                      className="rounded-md border border-border px-5 py-2 text-display text-sm text-foreground hover:bg-card/80"
                    >
                      Decline
                    </button>
                  </div>
                )}
                {opened.offer?.accepted && (
                  <p className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">Signed.</p>
                )}
                {opened.offer?.declined && (
                  <p className="mt-4 rounded-md border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">Declined.</p>
                )}
              </div>
            ) : (
              <p>Select a message to read.</p>
            )}
          </GamePanel>
        </div>
      </div>
    </GameShell>
  );
}
