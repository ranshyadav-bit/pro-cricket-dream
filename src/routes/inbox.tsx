import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import { generateFixtures } from "@/game/factory";
import { negotiateOffer, offerSlotConflict } from "@/game/scouts";
import type { InboxMessage, SaveGame } from "@/game/types";

export const Route = createFileRoute("/inbox")({
  component: Inbox,
});

function Inbox() {
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveGame | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [negotiating, setNegotiating] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSave();
    if (!s) navigate({ to: "/" });
    else setSave(s);
  }, [navigate]);

  if (!save) return null;

  const open = (id: string) => {
    setOpenId(id);
    setNegotiating(null);
    const next = {
      ...save,
      inbox: save.inbox.map((m) => (m.id === id ? { ...m, read: true } : m)),
    };
    writeSave(next);
    setSave(next);
  };

  const opened = save.inbox.find((m) => m.id === openId);

  function applyAccept(msg: InboxMessage, basePrice: number, signingBonus: number) {
    if (!msg.offer || !save) return;
    const o = msg.offer;
    const earnings = basePrice + signingBonus;
    const cs = save.contractSlots ?? { franchise: null, nation: null };
    const isFranchise = !!o.league;
    const isNation = o.tier === "International";
    const updatedSlots = { ...cs };
    if (isFranchise && o.league) {
      updatedSlots.franchise = { team: o.fromTeam, league: o.league, expiresYear: save.year + o.durationYears };
    }
    if (isNation) {
      updatedSlots.nation = { team: o.fromTeam, expiresYear: save.year + o.durationYears };
    }
    // Decide what 'team' becomes — franchise overrides display, but nation stays in slot
    const newTeam = isFranchise ? o.fromTeam : (isNation ? o.fromTeam : save.player.team);
    const newTier = isFranchise ? "Franchise T20" : (isNation ? "International" : save.player.tier);

    const next: SaveGame = {
      ...save,
      player: {
        ...save.player,
        team: newTeam,
        tier: newTier,
        cash: save.player.cash + earnings,
        morale: Math.min(100, save.player.morale + 8),
      },
      contractValue: earnings,
      contractSlots: updatedSlots,
      inbox: save.inbox.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              offer: { ...o, basePrice, signingBonus, accepted: true },
              body: m.body + `\n\n✓ ACCEPTED. You've signed with ${o.fromTeam}. $${earnings.toLocaleString()}k credited.`,
            }
          : m,
      ),
    };
    writeSave(next);
    setSave(next);
    setNegotiating(null);
  }

  function handleAccept(msg: InboxMessage) {
    if (!msg.offer || !save) return;
    const conflict = offerSlotConflict(save, msg.offer);
    if (conflict) {
      alert(conflict);
      return;
    }
    applyAccept(msg, msg.offer.basePrice, msg.offer.signingBonus);
  }

  function handleDecline(msg: InboxMessage) {
    if (!msg.offer || !save) return;
    const next: SaveGame = {
      ...save,
      inbox: save.inbox.map((m) =>
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

  function handleNegotiate(msg: InboxMessage) {
    if (!msg.offer || !save) return;
    const conflict = offerSlotConflict(save, msg.offer);
    if (conflict) {
      alert(conflict);
      return;
    }
    const { accepted, counter } = negotiateOffer(msg.offer);
    if (accepted) {
      applyAccept(msg, counter.basePrice, counter.signingBonus);
    } else {
      const next: SaveGame = {
        ...save,
        inbox: save.inbox.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                body: m.body + `\n\n💬 NEGOTIATION. You countered to $${counter.basePrice.toLocaleString()}k base / $${counter.signingBonus.toLocaleString()}k bonus.\n${msg.offer!.fromTeam} declined the counter and pulled the offer.`,
                offer: { ...m.offer!, declined: true },
              }
            : m,
        ),
      };
      writeSave(next);
      setSave(next);
    }
  }

  return (
    <GameShell>
      <div className="mb-4 flex items-end justify-between gap-2">
        <h1 className="text-display text-2xl">Inbox</h1>
        <div className="flex gap-2 text-xs">
          <Link to="/leagues" className="text-primary underline">World leagues →</Link>
          <Link to="/tournaments" className="text-primary underline">ICC tournaments →</Link>
        </div>
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
                      m.type === "milestone" ? "text-primary"
                        : m.type === "contract" || m.type === "scout" ? "text-accent"
                        : "text-foreground"
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
                  <div className="mt-5 space-y-3">
                    {(() => {
                      const conflict = offerSlotConflict(save, opened.offer);
                      if (conflict) {
                        return (
                          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            ⚠ {conflict}
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAccept(opened)}
                        className="rounded-md bg-gradient-primary px-5 py-2 text-display text-sm text-primary-foreground shadow-glow"
                      >
                        Accept Offer
                      </button>
                      <button
                        onClick={() => handleNegotiate(opened)}
                        disabled={negotiating === opened.id}
                        className="rounded-md border border-accent/40 bg-accent/10 px-5 py-2 text-display text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
                      >
                        Negotiate (+10–20%)
                      </button>
                      <button
                        onClick={() => handleDecline(opened)}
                        className="rounded-md border border-border px-5 py-2 text-display text-sm text-foreground hover:bg-card/80"
                      >
                        Decline
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Negotiating asks for a 10–20% bump. They have a 60% chance of agreeing — if they refuse, the offer is pulled.
                    </p>
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
