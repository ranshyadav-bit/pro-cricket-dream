import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/Panel";
import { loadSave, writeSave } from "@/game/storage";
import type { SaveGame } from "@/game/types";

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

  return (
    <GameShell>
      <h1 className="mb-4 text-display text-2xl">Inbox</h1>
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
                    <p className={`mt-1 line-clamp-1 text-sm ${m.type === "milestone" ? "text-primary" : "text-foreground"}`}>{m.subject}</p>
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
