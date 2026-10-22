import { serviceRest } from "../lib/supa";
import { rewrapDek } from "./crypto";

export interface RotationEnv {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  VAULT_KEK?: string;
  VAULT_KEK_VERSION?: string;
  VAULT_KEK_PREV?: string;
}

export const bytesToHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
export function hexToBytes(h: string): Uint8Array {
  const s = h.startsWith("\\x") ? h.slice(2) : h;
  return Uint8Array.from(s.match(/../g) ?? [], (x) => parseInt(x, 16));
}
export const kekVersion = (env: RotationEnv) => Number(env.VAULT_KEK_VERSION ?? "1") || 1;

/**
 * Annual KEK rotation (DEC-24): re-wrap every live DEK from VAULT_KEK_PREV to VAULT_KEK.
 * Documents are untouched (DEKs unchanged). Idempotent and batched; safe to re-run after partial failure.
 */
export async function rotateKek(env: RotationEnv, batch = 100): Promise<{ rewrapped: number; failed: number }> {
  if (!env.VAULT_KEK || !env.VAULT_KEK_PREV) return { rewrapped: 0, failed: 0 };
  const rest = serviceRest(env);
  const v = kekVersion(env);
  let rewrapped = 0;
  let failed = 0;
  for (;;) {
    const rows = await rest<{ id: string; wrapped_dek: string }[]>(
      `household_keys?kek_version=lt.${v}&shredded_at=is.null&select=id,wrapped_dek&limit=${batch}`,
    );
    if (!rows.length) break;
    for (const r of rows) {
      try {
        const w = await rewrapDek(env.VAULT_KEK_PREV, env.VAULT_KEK, hexToBytes(r.wrapped_dek));
        await rest(`household_keys?id=eq.${r.id}&kek_version=lt.${v}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({
            wrapped_dek: `\\x${bytesToHex(w)}`,
            kek_version: v,
            rewrapped_at: new Date().toISOString(),
          }),
        });
        rewrapped++;
      } catch {
        failed++;
      }
    }
    if (failed) break; // don't spin on a bad row; alert via returned count
  }
  return { rewrapped, failed };
}
