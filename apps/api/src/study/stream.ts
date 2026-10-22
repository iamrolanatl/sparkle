/**
 * Streaming for Ask Sparkle. Model tokens are buffered to sentence boundaries and every flushed chunk is screened
 * (cumulatively) before it reaches the child; on a failed screen the stream stops with the safe fallback.
 */
import { screenModelOutput } from "../tasks/safety";
import { redact } from "../chat/guard";

/** Parse Workers AI SSE bytes ("data: {response}") into text deltas. */
export async function* sseDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data) as { response?: string };
        if (j.response) yield j.response;
      } catch {
        /* partial/garbage line */
      }
    }
  }
}

export type Chunk = { type: "delta"; text: string } | { type: "stop"; reason: "unsafe_output" };

/** Sentence-buffered, cumulatively screened stream. */
export async function* screened(deltas: AsyncIterable<string>, maxChars = 2400): AsyncGenerator<Chunk> {
  let all = "";
  let pending = "";
  const flush = function* (force: boolean): Generator<Chunk, boolean> {
    const m = force
      ? pending.length
      : Math.max(
          pending.lastIndexOf(". "),
          pending.lastIndexOf("? "),
          pending.lastIndexOf("! "),
          pending.lastIndexOf("\n"),
        ) + 1;
    if (m <= 0) return true;
    const piece = pending.slice(0, m);
    const ok = screenModelOutput(all + piece);
    if (ok === null) {
      yield { type: "stop", reason: "unsafe_output" };
      return false;
    }
    all += piece;
    pending = pending.slice(m);
    // redaction may change the text; emit the redacted tail
    yield { type: "delta", text: redact(piece) };
    return true;
  };
  for await (const d of deltas) {
    pending += d;
    if (all.length + pending.length > maxChars) break;
    if (!(yield* flush(false))) return;
  }
  yield* flush(true);
}
