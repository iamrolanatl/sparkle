import agent from "../config/agent.json";

type Env = keyof typeof agent;

/** Single source for the API base used by the uploader AND the Tauri CSP (scripts/gen-tauri-config.mjs). */
export function apiBase(env: Env = "dev"): string {
  return agent[env].apiBase;
}

export function cspFor(env: Env = "dev"): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ipc: http://ipc.localhost ${apiBase(env)}`,
  ].join("; ");
}
