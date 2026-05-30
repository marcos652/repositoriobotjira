import crypto from 'crypto';

// Encryption key (32 bytes for AES-256)
// Auto-generates if not set in env
const ENCRYPTION_KEY = (() => {
  const envKey = process.env.AUTH_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) return envKey.slice(0, 32);
  // Fallback: derive from a combination of env vars (deterministic)
  const seed = `${process.env.JIRA_TOKEN || ''}${process.env.SLACK_TOKEN || ''}jiraops-secret-2024`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
})();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64 string containing IV + AuthTag + CipherText
 */
export function encrypt(data: object): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const json = JSON.stringify(data);
  let encrypted = cipher.update(json, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // IV (16 bytes) + AuthTag (16 bytes) + CipherText
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * Returns: parsed JSON object or null if invalid
 */
export function decrypt<T = any>(encryptedBase64: string): T | null {
  try {
    const combined = Buffer.from(encryptedBase64, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const cipherText = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

// Allowed emails (add all authorized users here)
export const ALLOWED_EMAILS = [
  'marcos.vinicius@movingpay.com.br',
  // Add more authorized emails as needed
];
