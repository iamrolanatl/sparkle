/**
 * Ask Sparkle voice (F-12, NFR-09): browser Web Speech API only. Audio never leaves the device through Sparkle;
 * only the final transcript text is sent. Every entry point degrades to text when unsupported.
 */
type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type W = {
  SpeechRecognition?: new () => Rec;
  webkitSpeechRecognition?: new () => Rec;
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};

export function voiceSupport(w: W | undefined = typeof window === "undefined" ? undefined : (window as unknown as W)) {
  return {
    stt: !!(w && (w.SpeechRecognition || w.webkitSpeechRecognition)),
    tts: !!(w && w.speechSynthesis && w.SpeechSynthesisUtterance),
  };
}

export type ListenEvents = {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (reason: "unsupported" | "denied" | "no_mic" | "no_speech" | "network" | "other") => void;
  onEnd?: () => void;
};

/** Start listening; returns a stop() handle, or null when unsupported (caller shows the text fallback). */
export function listen(
  ev: ListenEvents,
  lang = "en-US",
  w: W | undefined = typeof window === "undefined" ? undefined : (window as unknown as W),
) {
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Ctor) {
    ev.onError?.("unsupported");
    return null;
  }
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  let final = "";
  let done = false; // deliver at most one final transcript per session; abort() suppresses it
  r.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]!;
      if (res.isFinal) final += res[0]!.transcript;
      else interim += res[0]!.transcript;
    }
    if (interim) ev.onInterim?.((final + interim).trim());
  };
  r.onerror = (e) => {
    if (e.error === "aborted") return; // our own abort(), not a failure
    ev.onError?.(
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "denied"
        : e.error === "audio-capture"
          ? "no_mic"
          : e.error === "no-speech"
            ? "no_speech"
            : e.error === "network"
              ? "network"
              : "other",
    );
  };
  r.onend = () => {
    const t = final.trim().slice(0, 1000);
    if (t && !done) ev.onFinal(t);
    done = true;
    ev.onEnd?.();
  };
  try {
    r.start();
  } catch {
    ev.onError?.("other");
    return null;
  }
  return {
    stop: () => r.stop(),
    abort: () => {
      done = true;
      r.abort();
    },
  };
}

/** Text to speech for a reply chunk. Strips markdown-ish symbols. Returns false when unsupported. */
export function speak(
  text: string,
  opts: { rate?: number; onEnd?: () => void } = {},
  w: W | undefined = typeof window === "undefined" ? undefined : (window as unknown as W),
) {
  if (!w?.speechSynthesis || !w.SpeechSynthesisUtterance) return false;
  const clean = text
    .replace(/[*_#`>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;
  const u = new w.SpeechSynthesisUtterance(clean);
  u.rate = opts.rate ?? 1;
  if (opts.onEnd) u.onend = opts.onEnd;
  w.speechSynthesis.speak(u);
  return true;
}
export function stopSpeaking(w: W | undefined = typeof window === "undefined" ? undefined : (window as unknown as W)) {
  w?.speechSynthesis?.cancel();
}

/** Parse the /study-helper/:id/ask SSE stream into events (works with fetch() bodies). */
export async function* readAsk(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: Record<string, unknown> }> {
  const rd = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await rd.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = /^event: (.+)$/m.exec(block)?.[1] ?? "message";
      const d = /^data: (.+)$/m.exec(block)?.[1];
      if (d) yield { event: ev, data: JSON.parse(d) };
    }
  }
}

/** Speak a streamed reply sentence by sentence to cut time-to-first-audio (NFR-09). */
export function sentenceSplitter(onSentence: (s: string) => void) {
  let buf = "";
  return {
    push(t: string) {
      buf += t;
      let m: RegExpExecArray | null;
      while ((m = /^(.+?[.!?])(\s+|$)/s.exec(buf)) && m[2]) {
        onSentence(m[1]!.trim());
        buf = buf.slice(m[0].length);
      }
    },
    end() {
      if (buf.trim()) onSentence(buf.trim());
      buf = "";
    },
  };
}

/** Apply an update to one request's own message only (stops two streams interleaving into one bubble). */
export function patchById<M extends { rid?: number }>(log: M[], rid: number, f: (m: M) => M): M[] {
  return log.map((m) => (m.rid === rid ? f(m) : m));
}
