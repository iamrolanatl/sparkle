import type { PortalCredential } from "./types";

/**
 * On-device credential store (DEC-160). The production implementation is the OS keychain via the
 * Tauri shell (macOS Keychain / Windows Credential Manager). Credentials are never serialized,
 * logged or uploaded. The in-memory test double lives in `testing/` so the shell can't wire it by accident.
 */
export interface CredentialStore {
  get(studentId: string): Promise<PortalCredential | null>;
  set(studentId: string, cred: PortalCredential): Promise<void>;
  delete(studentId: string): Promise<void>;
}

/**
 * Per-student sync pause (Team C #47-3). A wrong password pauses scheduled runs until the credential is
 * updated, so we never retry a bad password 3×/day and lock the family's real portal account.
 */
export interface SyncStateStore {
  pausedReason(studentId: string): Promise<string | null>;
  pause(studentId: string, reason: string): Promise<void>;
  resume(studentId: string): Promise<void>;
}

/** Updating a credential is the only way to clear a bad_credentials pause. */
export async function updateCredential(
  creds: CredentialStore,
  state: SyncStateStore,
  studentId: string,
  cred: PortalCredential,
): Promise<void> {
  await creds.set(studentId, cred);
  await state.resume(studentId);
}
