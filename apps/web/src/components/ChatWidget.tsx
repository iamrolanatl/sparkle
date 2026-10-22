"use client";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
type Msg = { role: "user" | "assistant"; content: string };

/** Public "Questions?" sales & support chat (FR-19). AI-disclosed; no account needed. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Sparkle Guide, an AI assistant. Ask me anything about Sparkle. Please don't share student names, grades or passwords here.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [handoff, setHandoff] = useState<"closed" | "open" | "sent">("closed");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs, handoff]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const append = (t: string) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: c[c.length - 1]!.content + t };
        return c;
      });
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, page: location.pathname, messages: next.slice(1) }),
      });
      if (!res.ok || !res.body) {
        append(
          res.status === 429
            ? "You're sending messages fast. Please wait a minute."
            : 'Chat is unavailable right now. Try "Talk to a human".',
        );
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let event = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (l.startsWith("event:")) event = l.slice(6).trim();
          else if (l.startsWith("data:")) {
            const d = l.slice(5).replace(/^ /, "");
            if (event === "session") setSessionId(d);
            else if (event === "token") append(d);
          }
        }
      }
    } catch {
      append('Chat is unavailable right now. Try "Talk to a human".');
    } finally {
      setBusy(false);
    }
  }

  async function sendHandoff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch(`${API}/chat/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        email: f.get("email"),
        question: f.get("question"),
        company: f.get("company"),
      }),
    }).catch(() => null);
    setHandoff(res?.ok ? "sent" : "open");
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <section
          aria-label="Questions chat"
          className="spk-glass spk-glow flex h-[min(70dvh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between border-b border-[var(--spk-border)] px-4 py-2">
            <div>
              <p className="font-semibold">Questions?</p>
              <p className="text-muted text-xs">AI assistant · may be wrong · chats kept 30 days</p>
            </div>
            <button aria-label="Close chat" onClick={() => setOpen(false)} className="px-2">
              ✕
            </button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {msgs.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 ${m.role === "user" ? "ml-auto bg-cyan-500/20" : "spk-glass"}`}
              >
                {m.content || "…"}
              </p>
            ))}
            {handoff === "open" && (
              <form onSubmit={sendHandoff} className="spk-glass flex flex-col gap-2 p-3">
                <p className="text-xs">Leave your email and question. A person will reply.</p>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="spk-glass px-2 py-1"
                />
                <textarea
                  name="question"
                  required
                  maxLength={2000}
                  rows={3}
                  placeholder="Your question"
                  className="spk-glass px-2 py-1"
                />
                <input name="company" tabIndex={-1} aria-hidden className="hidden" />
                <button className="spk-glass px-3 py-1 font-medium">Send to a human</button>
              </form>
            )}
            {handoff === "sent" && <p className="text-xs">Thanks! A person will email you.</p>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-[var(--spk-border)] p-2">
            <label htmlFor="chat-in" className="sr-only">
              Message
            </label>
            <input
              id="chat-in"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask about Sparkle…"
              className="spk-glass min-w-0 flex-1 px-3 py-2 text-sm"
            />
            <button disabled={busy} className="spk-glass px-3 text-sm font-medium">
              Send
            </button>
          </form>
          {handoff === "closed" && (
            <button onClick={() => setHandoff("open")} className="text-muted pb-2 text-xs underline">
              Talk to a human
            </button>
          )}
        </section>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="spk-glass spk-glow px-4 py-2.5 text-sm font-semibold"
      >
        {open ? "Close" : "Questions? Ask me!"}
      </button>
    </div>
  );
}
