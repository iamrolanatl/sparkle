import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { SYSTEM_PROMPT } from "./knowledge";
import { BLOCKED_REPLY, CRISIS_REPLY, classify, estimateTokens, redact } from "./guard";
import { allow, type RateLimitBinding } from "./ratelimit";
import { Store } from "./store";

export const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export interface ChatEnv {
  AI?: { run: (model: string, input: unknown, opts?: unknown) => Promise<unknown> };
  CHAT_RATE_LIMITER?: RateLimitBinding;
  AI_GATEWAY_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

type Msg = { role: "user" | "assistant"; content: string };

async function sha256(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const chat = new Hono<{ Bindings: ChatEnv }>();

chat.post("/", async (c) => {
  const env = c.env ?? {};
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  if (!(await allow(`chat:${ip}`, env.CHAT_RATE_LIMITER))) return c.json({ error: "rate_limited" }, 429);

  const body = await c.req.json<{ sessionId?: string; messages?: Msg[]; page?: string }>().catch(() => null);
  const history = (body?.messages ?? []).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-10);
  const last = history[history.length - 1];
  if (!last || last.role !== "user" || last.content.length > 1000) return c.json({ error: "bad_request" }, 400);

  const store = new Store(env);
  // Kill switch + daily budget (feature flag 'sales_chat').
  try {
    const flag = await store.flag("sales_chat");
    if (flag && !flag.enabled) return c.json({ error: "chat_disabled" }, 503);
    const budget = flag?.config?.daily_token_budget;
    if (budget) {
      const usage = await store.usageToday();
      if (usage && Number(usage.tokens) >= budget) return c.json({ error: "chat_budget_exhausted" }, 503);
    }
  } catch { /* store unavailable: fail open on flags only in dev; storage optional */ }

  const ipHash = await sha256(ip);
  let sessionId = body?.sessionId ?? crypto.randomUUID();
  try { sessionId = await store.ensureSession(body?.sessionId, ipHash, body?.page); } catch { /* keep going */ }

  const verdict = classify(last.content);
  const userRedacted = redact(last.content);

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: "session", data: sessionId });
    const save = async (reply: string, flagged: boolean, role: "assistant" | "error" = "assistant") => {
      try {
        await store.addMessage(sessionId, "user", userRedacted, estimateTokens(SYSTEM_PROMPT + history.map((m) => m.content).join(" ")), 0, flagged);
        await store.addMessage(sessionId, role, redact(reply), 0, estimateTokens(reply), flagged);
        await store.touchSession(sessionId, flagged ? { flagged: true, flag_reason: verdict.kind === "blocked" ? verdict.reason : verdict.kind } : {});
      } catch { /* logging must never break the chat */ }
    };

    if (verdict.kind !== "ok") {
      const reply = verdict.kind === "crisis" ? CRISIS_REPLY : BLOCKED_REPLY;
      await stream.writeSSE({ event: "token", data: reply });
      await stream.writeSSE({ event: "done", data: "" });
      await save(reply, true);
      return;
    }
    if (!env.AI) {
      const reply = "Chat isn't connected yet. Please use \"Talk to a human\" and we'll get back to you.";
      await stream.writeSSE({ event: "token", data: reply });
      await stream.writeSSE({ event: "done", data: "" });
      await save(reply, false, "error");
      return;
    }

    let reply = "";
    try {
      const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history.map((m) => ({ role: m.role, content: redact(m.content) }))];
      const result = await env.AI.run(CHAT_MODEL, { messages, stream: true, max_tokens: 300 },
        env.AI_GATEWAY_ID ? { gateway: { id: env.AI_GATEWAY_ID } } : undefined);
      const reader = (result as ReadableStream<Uint8Array>).getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.replace(/^data:\s*/, "").trim();
          if (!data || data === "[DONE]") continue;
          try {
            const tok = (JSON.parse(data) as { response?: string }).response ?? "";
            if (tok) { reply += tok; await stream.writeSSE({ event: "token", data: tok }); }
          } catch { /* partial line */ }
        }
      }
      await stream.writeSSE({ event: "done", data: "" });
      await save(reply, false);
    } catch (e) {
      console.error("chat_ai_error", e instanceof Error ? e.message : String(e));
      const msg = "Sorry, I'm having trouble right now. You can use \"Talk to a human\".";
      await stream.writeSSE({ event: "token", data: msg });
      await stream.writeSSE({ event: "done", data: "" });
      await save(msg, false, "error");
    }
  });
});

chat.post("/handoff", async (c) => {
  const env = c.env ?? {};
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  if (!(await allow(`handoff:${ip}`, undefined, 3, 3_600_000))) return c.json({ error: "rate_limited" }, 429);
  const b = await c.req.json<{ sessionId?: string; email?: string; question?: string; company?: string }>().catch(() => null);
  if (b?.company) return c.json({ ok: true }); // honeypot
  const email = (b?.email ?? "").trim().toLowerCase();
  const question = (b?.question ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !question || question.length > 2000) return c.json({ error: "bad_request" }, 400);
  const store = new Store(env);
  if (!store.enabled) return c.json({ error: "unavailable" }, 503);
  // Email is kept (needed to reply); question is redacted of other contact data.
  await store.addTicket(b?.sessionId, email, redact(question));
  return c.json({ ok: true });
});
