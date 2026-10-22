import type { CredentialStore, SyncStateStore } from "../credentials";
import type { PortalCredential } from "../types";

/** TEST ONLY. Plain in-memory stores; never use in the shell (credentials must go to the OS keychain). */
export class InsecureMemoryCredentialStore implements CredentialStore {
  #m = new Map<string, PortalCredential>();
  async get(id: string) {
    return this.#m.get(id) ?? null;
  }
  async set(id: string, c: PortalCredential) {
    this.#m.set(id, { ...c });
  }
  async delete(id: string) {
    this.#m.delete(id);
  }
}

export class InsecureMemorySyncState implements SyncStateStore {
  #m = new Map<string, string>();
  async pausedReason(id: string) {
    return this.#m.get(id) ?? null;
  }
  async pause(id: string, reason: string) {
    this.#m.set(id, reason);
  }
  async resume(id: string) {
    this.#m.delete(id);
  }
}
