/** Minimal PostgREST client using the service-role secret (server-side only). No-ops when unconfigured. */
export interface StoreEnv { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string }

export class Store {
  constructor(private env: StoreEnv, private fetcher: typeof fetch = fetch) {}
  get enabled() { return Boolean(this.env.SUPABASE_URL && this.env.SUPABASE_SECRET_KEY); }

  private async req(path: string, init: RequestInit = {}) {
    if (!this.enabled) return null;
    const res = await this.fetcher(`${this.env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${this.env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`supabase ${path} ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async flag(key: string): Promise<{ enabled: boolean; config: Record<string, number> } | null> {
    const rows = await this.req(`feature_flags?key=eq.${encodeURIComponent(key)}&select=enabled,config`);
    return rows?.[0] ?? null;
  }
  async usageToday(): Promise<{ tokens: number } | null> {
    const rows = await this.req("rpc/chat_usage_today", { method: "POST", body: "{}" });
    return rows?.[0] ?? null;
  }
  async ensureSession(id: string | undefined, ipHash: string, page?: string): Promise<string> {
    if (id && this.enabled) {
      const rows = await this.req(`chat_sessions?id=eq.${id}&select=id,message_count`);
      if (rows?.[0]) return id;
    }
    const rows = await this.req("chat_sessions", { method: "POST", body: JSON.stringify({ ip_hash: ipHash, page }) });
    return rows?.[0]?.id ?? id ?? crypto.randomUUID();
  }
  async addMessage(sessionId: string, role: "user" | "assistant" | "error", content: string, tokensIn = 0, tokensOut = 0, flagged = false) {
    await this.req("chat_messages", { method: "POST", body: JSON.stringify({ session_id: sessionId, role, content_redacted: content, tokens_in: tokensIn, tokens_out: tokensOut, flagged }), headers: { Prefer: "return=minimal" } });
  }
  async touchSession(sessionId: string, patch: Record<string, unknown>) {
    await this.req(`chat_sessions?id=eq.${sessionId}`, { method: "PATCH", body: JSON.stringify({ ...patch, last_message_at: new Date().toISOString() }), headers: { Prefer: "return=minimal" } });
  }
  async addTicket(sessionId: string | undefined, email: string, question: string) {
    await this.req("support_tickets", { method: "POST", body: JSON.stringify({ session_id: sessionId ?? null, email, question }), headers: { Prefer: "return=minimal" } });
    if (sessionId) await this.touchSession(sessionId, { escalated: true });
  }
}
