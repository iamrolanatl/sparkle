/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias -- test doubles for browser Speech APIs */
import { describe, expect, it, vi } from "vitest";
import { listen, patchById, readAsk, sentenceSplitter, speak, stopSpeaking, voiceSupport } from "./speech";

describe("voice", () => {
  it("reports no support and falls back", () => {
    expect(voiceSupport({})).toEqual({ stt: false, tts: false });
    const onError = vi.fn();
    expect(listen({ onFinal: vi.fn(), onError }, "en-US", {})).toBeNull();
    expect(onError).toHaveBeenCalledWith("unsupported");
    expect(speak("hi", {}, {})).toBe(false);
  });
  it("delivers the final transcript", () => {
    let inst: any;
    class R {
      constructor() {
        inst = this;
      }
      start() {}
      stop() {}
      abort() {}
    }
    const onFinal = vi.fn();
    listen({ onFinal }, "en-US", { webkitSpeechRecognition: R as never });
    const res = Object.assign([{ transcript: "what is x" }], { isFinal: true });
    inst.onresult({ resultIndex: 0, results: [res] });
    inst.onend();
    expect(onFinal).toHaveBeenCalledWith("what is x");
  });
  it("maps permission denial", () => {
    let inst: any;
    class R {
      constructor() {
        inst = this;
      }
      start() {}
      stop() {}
      abort() {}
    }
    const onError = vi.fn();
    listen({ onFinal: vi.fn(), onError }, "en-US", { SpeechRecognition: R as never });
    inst.onerror({ error: "not-allowed" });
    expect(onError).toHaveBeenCalledWith("denied");
  });
  it("speaks cleaned text", () => {
    const spoken: string[] = [];
    class U {
      constructor(public text: string) {}
      rate = 1;
    }
    const ok = speak(
      "**Yes** x",
      {},
      { speechSynthesis: { speak: (u: U) => spoken.push(u.text) } as never, SpeechSynthesisUtterance: U as never },
    );
    expect(ok).toBe(true);
    expect(spoken).toEqual(["Yes x"]);
    const cancel = vi.fn();
    stopSpeaking({ speechSynthesis: { cancel } as never });
    expect(cancel).toHaveBeenCalled();
  });
  it("splits sentences for low-latency TTS", () => {
    const s: string[] = [];
    const sp = sentenceSplitter((x) => s.push(x));
    sp.push("Hi Eli! Let's");
    sp.push(" go. And");
    sp.end();
    expect(s).toEqual(["Hi Eli!", "Let's go.", "And"]);
  });
  it("reads the SSE stream", async () => {
    const body = new Response('event: delta\ndata: {"text":"hi"}\n\nevent: done\ndata: {"safety":"ok"}\n\n').body!;
    const ev = [];
    for await (const e of readAsk(body)) ev.push(e.event);
    expect(ev).toEqual(["delta", "done"]);
  });
  it("regression: one final per session, abort suppresses it", () => {
    const insts: any[] = [];
    class R {
      constructor() {
        insts.push(this);
      }
      start() {}
      stop() {}
      abort() {}
    }
    const onFinal = vi.fn();
    const h = listen({ onFinal }, "en-US", { webkitSpeechRecognition: R as never })!;
    const res = Object.assign([{ transcript: "what is x" }], { isFinal: true });
    insts[0].onresult({ resultIndex: 0, results: [res] });
    insts[0].onend();
    insts[0].onend(); // some engines fire end twice
    expect(onFinal).toHaveBeenCalledTimes(1);
    const g = listen({ onFinal }, "en-US", { webkitSpeechRecognition: R as never })!;
    insts[1].onresult({ resultIndex: 0, results: [res] });
    g.abort(); // "Type instead" / new mic tap
    insts[1].onend();
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(h).toBeTruthy();
  });
  it("regression: two concurrent replies never interleave into one bubble", () => {
    type M = { who: string; text: string; rid?: number };
    let log: M[] = [{ who: "ai", text: "", rid: 1 }];
    log = [...log, { who: "ai", text: "", rid: 2 }];
    // stream 1 keeps arriving after bubble 2 exists (old code patched "last" → merged text)
    log = patchById(log, 1, (m) => ({ ...m, text: m.text + "We already solved this!" }));
    log = patchById(log, 2, (m) => ({ ...m, text: m.text + "Your turn." }));
    expect(log.map((m) => m.text)).toEqual(["We already solved this!", "Your turn."]);
  });
});
