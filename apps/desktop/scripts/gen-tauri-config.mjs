// Writes the CSP in src-tauri/tauri.conf.json from config/agent.json so the uploader's API base and the
// CSP can't drift (Team C #61-7, Team E #61-3). Usage: node scripts/gen-tauri-config.mjs [dev|production]
import { readFileSync, writeFileSync } from "node:fs";
const env = process.argv[2] ?? "dev";
const agent = JSON.parse(readFileSync(new URL("../config/agent.json", import.meta.url)));
if (!agent[env]) throw new Error(`unknown env ${env}`);
const p = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const conf = JSON.parse(readFileSync(p));
conf.app.security.csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ipc: http://ipc.localhost ${agent[env].apiBase}`,
].join("; ");
writeFileSync(p, JSON.stringify(conf, null, 2) + "\n");
console.log(`tauri.conf.json CSP set for ${env}`);
