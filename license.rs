use hmac::{Hmac, Mac};
use sha2::Sha256;
use data_encoding::BASE32_NOPAD;
use subtle::ConstantTimeEq;
use keyring::Entry;
use serde::{Deserialize, Serialize};

type HmacSha256 = Hmac<Sha256>;
const LICENSE_SECRET: &str = "RS_PROD_VIEWER_2026_SUPER_SECRET_KEY"; // In prod, inject via env vars

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Clone)]
pub struct LicensePayload {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
}

/// Generates the deterministic license key
pub fn generate_license_key(email: &str, first: &str, last: &str) -> String {
    // Normalize input
    let payload_str = format!(
        "{}|{}|{}",
        email.trim().to_lowercase(),
        first.trim().to_lowercase(),
        last.trim().to_lowercase()
    );

    // Generate HMAC-SHA256 signature
    let mut mac = HmacSha256::new_from_slice(LICENSE_SECRET.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload_str.as_bytes());
    let result = mac.finalize().into_bytes();

    // Base32 encode, slice to 25 chars, and chunk by 5
    let b32 = BASE32_NOPAD.encode(&result);
    let truncated = &b32[0..25];
    
    let chunks: Vec<String> = truncated
        .chars()
        .collect::<Vec<char>>()
        .chunks(5)
        .map(|c| c.iter().collect())
        .collect();
        
    chunks.join("-")
}

/// Validates a user-provided key using constant-time comparison
pub fn validate_license(key: &str, email: &str, first: &str, last: &str) -> bool {
    let expected_key = generate_license_key(email, first, last);
    
    // Constant-time comparison to prevent timing attacks
    expected_key.as_bytes().ct_eq(key.as_bytes()).unwrap_u8() == 1
}

/// Securely stores the license via OS Keychain / Credential Manager
pub fn save_license_to_keyring(key: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new("RisenShineViewer", "license_key")?;
    entry.set_password(key)
}

/// Retrieves the stored license
pub fn get_license_from_keyring() -> Result<String, keyring::Error> {
    let entry = Entry::new("RisenShineViewer", "license_key")?;
    entry.get_password()
}

/// Removes the license key from the OS Keychain / Credential Manager
pub fn remove_license_from_keyring() -> Result<(), keyring::Error> {
    let entry = Entry::new("RisenShineViewer", "license_key")?;
    entry.delete_password()
}