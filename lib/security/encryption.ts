import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// Derive a 32-byte key from the ENCRYPTION_SECRET or NEXTAUTH_SECRET using SHA-256
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn("WARNING: Neither ENCRYPTION_SECRET nor NEXTAUTH_SECRET is configured. Falling back to default insecure key.");
    return crypto.createHash("sha256").update("sophia-default-insecure-key-fallback").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a plaintext string to ciphertext with a random IV.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to secure AI API key.");
  }
}

/**
 * Decrypts an IV-prefixed ciphertext string back to plaintext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      // Return as-is if format does not match (possibly unencrypted legacy dev data)
      return encryptedText;
    }
    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt AI API key.");
  }
}
