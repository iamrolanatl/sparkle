/** DEC-24 envelope encryption: per-household AES-256-GCM DEK wrapped by KEK (Workers secret VAULT_KEK, base64 32 bytes). */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64d = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function importKek(kekB64: string): Promise<CryptoKey> {
  const raw = b64d(kekB64);
  if (raw.length !== 32) throw new Error("VAULT_KEK must be 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-KW", false, ["wrapKey", "unwrapKey"]);
}

export async function newWrappedDek(kekB64: string): Promise<Uint8Array> {
  const dek = (await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ])) as CryptoKey;
  return new Uint8Array(await crypto.subtle.wrapKey("raw", dek, await importKek(kekB64), "AES-KW"));
}

export async function unwrapDek(kekB64: string, wrapped: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey("raw", wrapped, await importKek(kekB64), "AES-KW", "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Output = 12-byte IV || ciphertext+tag. AAD binds ciphertext to its document id. */
export async function seal(dek: CryptoKey, data: Uint8Array | string, aad: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = typeof data === "string" ? enc.encode(data) : data;
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, dek, pt),
  );
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}

export async function open(dek: CryptoKey, sealed: Uint8Array, aad: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sealed.slice(0, 12), additionalData: enc.encode(aad) },
      dek,
      sealed.slice(12),
    ),
  );
}

export const openText = async (dek: CryptoKey, sealed: Uint8Array, aad: string) =>
  dec.decode(await open(dek, sealed, aad));

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** KEK rotation: unwrap with old KEK, wrap with new (DEK bytes never leave WebCrypto as plaintext JS values). */
export async function rewrapDek(oldKekB64: string, newKekB64: string, wrapped: Uint8Array): Promise<Uint8Array> {
  const dek = await crypto.subtle.unwrapKey("raw", wrapped, await importKek(oldKekB64), "AES-KW", "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
  return new Uint8Array(await crypto.subtle.wrapKey("raw", dek, await importKek(newKekB64), "AES-KW"));
}
