// /crypto/deriveKey.js

const argon2 = require("argon2");
const crypto = require("crypto");

/*
    deriveKey(password)

    1. Generate a random 16-byte salt
    2. Use Argon2id to derive a 32-byte (256-bit) key
    3. Return both:
        - derived key (Buffer)
        - salt (Buffer)
*/

async function deriveKey(password, salt = null) {
    try {
        // If salt not provided (first time signup), generate new one
        const usedSalt = salt || crypto.randomBytes(16);

        // Argon2id parameters (strongest modern KDF)
        const key = await argon2.hash(password, {
            type: argon2.argon2id,
            hashLength: 32,            // 256-bit key
            salt: usedSalt,
            timeCost: 3,               // iterations
            memoryCost: 2 ** 16,       // 64 MB RAM usage
            parallelism: 1,
            raw: true                  // important → return raw key bytes (Buffer)
        });

        return {
            key,       // Buffer (32 bytes)
            salt: usedSalt
        };

    } catch (err) {
        console.error("Error in deriveKey:", err);
        throw err;
    }
}

module.exports = deriveKey;
