import type { PortalCredential } from "./types";

/**
 * On-device credential store (DEC-160). Production impl = OS keychain via the Tauri keyring plugin
 * (macOS Keychain / Windows Credential Manager). Credentials are never serialized, logged or uploaded.
 */
export interface CredentialStore {
  get(studentId: string): Promise<PortalCredential | null>;
  set(studentId: string, cred: PortalCredential): Promise<void>;
  delete(studentId: string): Promise<void>;
}

export class MemoryCredentialStore implements CredentialStore {
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
