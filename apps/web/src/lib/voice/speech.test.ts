/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias -- test doubles for browser Speech APIs */
import { describe, expect, it, vi } from "vitest";
import { listen, readAsk, sentenceSplitter, speak, stopSpeaking, voiceSupport } from "./speech";

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
});
