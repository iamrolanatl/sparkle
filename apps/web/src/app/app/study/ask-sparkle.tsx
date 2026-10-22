"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bot } from "../chrome";
import { listen, patchById, readAsk, sentenceSplitter, speak, stopSpeaking, voiceSupport } from "@/lib/voice/speech";

type Msg = { who: "me" | "ai"; text: string; voice?: boolean; sources?: string[]; coach?: boolean; rid?: number };
type Cls = { id: string; name: string; color: string; pct: number | null; unit: string | null };
type Mode = "idle" | "listening" | "speaking";

const initials = (n: string) =>
  n
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 1)
    .toUpperCase();

const noop = () => () => {};

const REPLY: Record<string, string> = {
  rate_limited: "Let's take a short break. You can ask me again in a little while.",
  unavailable: "I'm resting right now. Try again soon!",
  unsafe: "I can't help with that. Let's get back to schoolwork. What are you studying?",
  prompt_injection: "I can only help with schoolwork. What are you studying?",
  age_inappropriate: "That's not something I can help with. Want help with a class instead?",
};

export function AskSparkle(props: {
  studentId: string;
  greet: string;
  greetSources: string[];
  suggestions: string[];
  classes: Cls[];
}) {
  const [log, setLog] = useState<Msg[]>([{ who: "ai", text: props.greet, sources: props.greetSources }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [live, setLive] = useState("");
  const sttOk = useSyncExternalStore(
    noop,
    () => voiceSupport().stt,
    () => true,
  );
  const ttsOk = useSyncExternalStore(
    noop,
    () => voiceSupport().tts,
    () => true,
  );
  const sup = { stt: sttOk, tts: ttsOk };
  const [note, setNote] = useState<string | null>(null);
  const stopRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  // Synchronous guards: state-based `busy` is stale inside a single tick, so two quick sends
  // (double voice final, double click) could interleave two streams into one bubble.
  const busyRef = useRef(false);
  const seq = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);
  useEffect(
    () => () => {
      stopSpeaking();
    },
    [],
  );

  async function send(q: string, voice = false) {
    q = q.trim();
    if (!q || busy || busyRef.current) return;
    busyRef.current = true;
    const rid = ++seq.current;
    setBusy(true);
    setText("");
    const history = log.slice(-6).map((m) => ({ role: m.who === "me" ? "user" : "assistant", text: m.text }));
    setLog((l) => [...l, { who: "me", text: q, voice }, { who: "ai", text: "", rid }]);
    // Patch only this request's own bubble, never "whatever is last".
    const patch = (f: (m: Msg) => Msg) => setLog((l) => patchById(l, rid, f));
    let pending = 0;
    const tts = voice && sup.tts;
    const say = sentenceSplitter((s) => {
      pending++;
      setMode("speaking");
      setLive(s);
      speak(s, {
        onEnd: () => {
          if (--pending <= 0) setMode("idle");
        },
      });
    });
    try {
      const r = await fetch(`/app/study/ask?student=${props.studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q, history, voice }),
      });
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("event-stream") || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { safety?: string; message?: string; reason?: string };
        const t = j.safety === "crisis" && j.message ? j.message : (REPLY[j.reason ?? ""] ?? REPLY.unavailable!);
        patch((m) => ({ ...m, text: t }));
        if (tts) {
          say.push(t);
          say.end();
        }
        return;
      }
      for await (const ev of readAsk(r.body)) {
        if (ev.event === "meta") patch((m) => ({ ...m, coach: ev.data.mode === "coach" }));
        else if (ev.event === "delta") {
          const t = String(ev.data.text ?? "");
          patch((m) => ({ ...m, text: m.text + t }));
          if (tts) say.push(t);
        } else if (ev.event === "replace") {
          stopSpeaking();
          patch((m) => ({ ...m, text: String(ev.data.text ?? "") }));
        } else if (ev.event === "error") patch((m) => ({ ...m, text: m.text || REPLY.unavailable! }));
      }
      if (tts) say.end();
    } catch {
      patch((m) => ({ ...m, text: m.text || REPLY.unavailable! }));
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (!tts || pending === 0) setMode((x) => (x === "speaking" && pending > 0 ? x : "idle"));
    }
  }

  function mic() {
    if (!sup.stt) {
      setNote("Voice isn't supported in this browser. You can still type, and Sparkle will reply in text.");
      return;
    }
    stopSpeaking();
    stopRef.current?.abort();
    setLive("");
    setMode("listening");
    stopRef.current = listen({
      onInterim: setLive,
      onFinal: (t) => {
        setLive(t);
        void send(t, true);
      },
      onError: (e) => {
        setMode("idle");
        setNote(
          e === "denied"
            ? "Microphone access is off. Allow it in your browser settings, or type instead."
            : e === "no_speech"
              ? "I didn't hear anything. Tap the mic and try again."
              : "Voice isn't available right now. You can type instead.",
        );
      },
      onEnd: () => setMode((m) => (m === "listening" ? "idle" : m)),
    });
  }
  const typeInstead = () => {
    stopRef.current?.abort();
    stopSpeaking();
    setMode("idle");
  };

  return (
    <div className="askwrap">
      <div className={`panel askchat ${mode}`}>
        <div className="askh">
          <Bot size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>Sparkle</div>
            <div className="mutd">Knows your classes, grades and teacher posts</div>
          </div>
          <span className="beta">AI · beta</span>
        </div>
        <div className="msgs" aria-live="polite">
          {log.map((m, i) => (
            <div key={i} className={`b ${m.who}`}>
              {m.voice ? <div className="vtag">🎙 voice</div> : null}
              {m.coach ? <div className="vtag coach">Coach mode</div> : null}
              {m.text || (busy && i === log.length - 1 ? <span className="dots">●●●</span> : "")}
              {m.sources?.length ? (
                <div className="src">
                  {m.sources.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {note ? (
          <div className="asknote" role="status">
            {note}
          </div>
        ) : null}
        {mode === "idle" ? (
          <>
            <div className="sug">
              {props.suggestions.map((s) => (
                <button key={s} className="chip" onClick={() => void send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
            <form
              className="comp"
              onSubmit={(e) => {
                e.preventDefault();
                void send(text);
              }}
            >
              <input
                className="inp"
                aria-label="Message Sparkle"
                placeholder="Ask about a class, assignment or topic…"
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                type="button"
                className={`mic ${sup.stt ? "" : "off"}`}
                aria-label="Talk to Sparkle"
                onClick={mic}
                disabled={busy}
              >
                🎙
              </button>
              <button className="pill" disabled={busy || !text.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="live">
            <span className="fl" style={{ left: "22%", top: 20 }}>
              ✦
            </span>
            <span className="fl" style={{ right: "24%", top: 40, animationDelay: "1s" }}>
              ✦
            </span>
            <span className="fl" style={{ left: "30%", bottom: 40, animationDelay: "2s" }}>
              ✦
            </span>
            <div className="orb">
              <Bot size={48} />
            </div>
            <div className="wave" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${(i * 0.08).toFixed(2)}s` }} />
              ))}
            </div>
            <div style={{ fontWeight: 600 }}>{mode === "speaking" ? "Sparkle is speaking…" : "Listening…"}</div>
            <div className="mutd" style={{ textAlign: "center" }}>
              {live ? `“${live}”` : " "}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ghost" onClick={() => (mode === "speaking" ? typeInstead() : stopRef.current?.stop())}>
                {mode === "speaking" ? "⏸ Stop" : "■ Done"}
              </button>
              <button className="pill" onClick={typeInstead}>
                ⌨ Type instead
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="askside">
        <div className="panel">
          <div className="ph">Sparkle is looking at</div>
          {props.classes.map((c) => (
            <div className="row" key={c.id}>
              <span className="cav" style={{ background: c.color, color: "#fff" }} aria-hidden="true">
                {initials(c.name)}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div className="mutd">
                  {[c.pct != null ? c.pct.toFixed(1) : null, c.unit].filter(Boolean).join(" · ") || "No grade yet"}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>How Sparkle helps</div>
          <div className="mutd" style={{ lineHeight: 1.5 }}>
            Sparkle coaches you step by step and won&apos;t do graded work for you. It&apos;s an AI and can make
            mistakes, so check with your teacher. Voice stays in your browser; only the text is sent.
          </div>
        </div>
      </div>
    </div>
  );
}
