/**
 * Synthetic uptime probe (SLO-Dashboards.md "Synthetic", NFR-36). Free: a separate Worker
 * (`sparkle-synthetic`) on a 5-minute cron. A failed probe throws, so Workers Observability
 * raises a Real-Time Issue, delivered by the "Sparkle SLO" Cloudflare email notifications.
 */
export interface ProbeTarget {
  name: string;
  url: string;
  expect?: (res: Response) => boolean | Promise<boolean>;
}
export interface ProbeResult {
  name: string;
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
}

export async function probe(t: ProbeTarget, fetcher: typeof fetch = fetch, timeoutMs = 8000): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetcher(t.url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "sparkle-synthetic/1" },
    });
    const ok = t.expect ? await t.expect(res) : res.ok;
    return { name: t.name, ok, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { name: t.name, ok: false, status: 0, ms: Date.now() - start, error: e instanceof Error ? e.name : "error" };
  }
}

export function targets(env: { API_URL: string; WEB_URL: string }): ProbeTarget[] {
  return [
    {
      name: "api-health",
      url: `${env.API_URL}/health`,
      expect: async (r) => r.ok && (await r.json<{ ok?: boolean }>()).ok === true,
    },
    { name: "web-home", url: `${env.WEB_URL}/` },
  ];
}

export async function runProbes(ts: ProbeTarget[], fetcher: typeof fetch = fetch): Promise<ProbeResult[]> {
  const results = await Promise.all(ts.map((t) => probe(t, fetcher)));
  console.log(JSON.stringify({ synthetic: results }));
  const failed = results.filter((r) => !r.ok);
  if (failed.length)
    throw new Error(`synthetic probe failed: ${failed.map((f) => `${f.name}=${f.status}`).join(", ")}`);
  return results;
}

export default {
  async scheduled(_c: ScheduledController, env: { API_URL: string; WEB_URL: string }) {
    await runProbes(targets(env));
  },
  async fetch() {
    return new Response("sparkle-synthetic", { status: 200 });
  },
};
