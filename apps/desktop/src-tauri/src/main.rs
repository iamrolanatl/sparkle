// Sparkle desktop sync agent shell (Team D, FR-11, WBS 3.2). Unsigned dev scaffold — no installers yet (SA-D3).
// Portal credentials live ONLY in the OS keychain (DEC-160). The webview can store, check or delete a
// credential but can never read it back; the Playwright sidecar (follow-up) receives it from Rust over stdin.
// Secrets are held in `Zeroizing` buffers so they are wiped from memory on drop.
// UI rule (for the follow-up form PR): the password field is passed straight to `credential_set` and must never be
// put in any JS state store, localStorage, log or telemetry.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use zeroize::Zeroizing;

const SERVICE: &str = "app.sparkle.desktop.portal";

fn is_uuid(s: &str) -> bool {
    s.len() == 36 && s.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

/// Keyed by `<profile_id>:<student_id>` so two Sparkle accounts on one OS user never overwrite each other.
fn entry(profile_id: &str, student_id: &str) -> Result<keyring::Entry, String> {
    if !is_uuid(profile_id) || !is_uuid(student_id) {
        return Err("bad_id".into());
    }
    keyring::Entry::new(SERVICE, &format!("{profile_id}:{student_id}")).map_err(|_| "keychain_unavailable".into())
}

#[derive(serde::Serialize)]
struct Stored<'a> {
    username: &'a str,
    password: &'a str,
}

#[tauri::command]
fn credential_set(
    profile_id: String,
    student_id: String,
    username: Zeroizing<String>,
    password: Zeroizing<String>,
) -> Result<(), String> {
    let v = Zeroizing::new(
        serde_json::to_string(&Stored { username: &username, password: &password }).map_err(|_| "encode_failed")?,
    );
    entry(&profile_id, &student_id)?.set_password(&v).map_err(|_| "keychain_write_failed".into())
}

/// keyring 3 has no portable metadata-only lookup, so the secret is read into a Zeroizing buffer and wiped at once.
#[tauri::command]
fn credential_exists(profile_id: String, student_id: String) -> Result<bool, String> {
    match entry(&profile_id, &student_id)?.get_password() {
        Ok(secret) => {
            drop(Zeroizing::new(secret));
            Ok(true)
        }
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("keychain_read_failed".into()),
    }
}

#[tauri::command]
fn credential_delete(profile_id: String, student_id: String) -> Result<(), String> {
    match entry(&profile_id, &student_id)?.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("keychain_delete_failed".into()),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![credential_set, credential_exists, credential_delete])
        .run(tauri::generate_context!())
        .expect("error while running Sparkle desktop agent");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_bad_ids_before_touching_the_keychain() {
        assert!(entry("not-a-uuid", "10000000-0000-0000-0000-00000000000a").is_err());
        assert!(entry("00000000-0000-0000-0000-00000000000a", "x").is_err());
    }
}
