import crypto from 'crypto';

// Encryption key (32 bytes for AES-256)
const ENCRYPTION_KEY = (() => {
  const envKey = process.env.AUTH_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) return envKey.slice(0, 32);
  const seed = `${process.env.JIRA_TOKEN || ''}${process.env.SLACK_TOKEN || ''}jiraops-secret-2024`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
})();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: object): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const json = JSON.stringify(data);
  let encrypted = cipher.update(json, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
  return combined.toString('base64');
}

/**
 * Decrypt data encrypted with AES-256-GCM
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

// ═══════════════════════════════════════════
//  SECURE EMAIL STORAGE
//  - Emails stored as SHA-256 hashes (for verification)
//  - Encrypted copies stored (for admin listing only)
//  - Even if someone dumps memory, they see only hashes
// ═══════════════════════════════════════════

function hashEmail(email: string): string {
  return crypto.createHash('sha256')
    .update(email.trim().toLowerCase() + ':jiraops-salt-2024')
    .digest('hex');
}

function encryptEmail(email: string): string {
  return encrypt({ email: email.trim().toLowerCase(), ts: Date.now() });
}

function decryptEmail(encrypted: string): string | null {
  const data = decrypt<{ email: string }>(encrypted);
  return data?.email || null;
}

// Storage: hash → encrypted email
interface SecureEmail {
  hash: string;
  encrypted: string; // AES-256-GCM encrypted email
  addedAt: string;
  addedBy?: string;
}

const DEFAULT_EMAILS = ['marcos.vinicius@movingpay.com.br'];

// Initialize with default + env var emails
const _emailStore = new Map<string, SecureEmail>();

function initializeEmails() {
  // Add defaults
  for (const email of DEFAULT_EMAILS) {
    const hash = hashEmail(email);
    if (!_emailStore.has(hash)) {
      _emailStore.set(hash, {
        hash,
        encrypted: encryptEmail(email),
        addedAt: new Date().toISOString(),
        addedBy: 'system',
      });
    }
  }

  // Add from env var
  const envEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0 && e.includes('@'));

  for (const email of envEmails) {
    const hash = hashEmail(email);
    if (!_emailStore.has(hash)) {
      _emailStore.set(hash, {
        hash,
        encrypted: encryptEmail(email),
        addedAt: new Date().toISOString(),
        addedBy: 'env',
      });
    }
  }
}

initializeEmails();

// ── Public API ──
export const ALLOWED_EMAILS = {
  /** Check if email is allowed (hash comparison — never exposes email) */
  includes: (email: string): boolean => {
    const hash = hashEmail(email);
    return _emailStore.has(hash);
  },

  /** List emails (decrypted — admin only) */
  list: (): Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean }> => {
    const result: Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean }> = [];
    for (const entry of _emailStore.values()) {
      const email = decryptEmail(entry.encrypted);
      if (email) {
        result.push({
          email,
          addedAt: entry.addedAt,
          addedBy: entry.addedBy,
          isDefault: DEFAULT_EMAILS.includes(email),
        });
      }
    }
    return result;
  },

  /** List hashes only (safe to expose — unreadable) */
  listHashes: (): string[] => {
    return Array.from(_emailStore.keys());
  },

  /** Add a new email (stores hash + encrypted) */
  add: (email: string, addedBy?: string): boolean => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) return false;
    const hash = hashEmail(normalized);
    if (_emailStore.has(hash)) return false; // already exists
    _emailStore.set(hash, {
      hash,
      encrypted: encryptEmail(normalized),
      addedAt: new Date().toISOString(),
      addedBy: addedBy || 'admin',
    });
    return true;
  },

  /** Remove an email */
  remove: (email: string): boolean => {
    const normalized = email.trim().toLowerCase();
    // Prevent removing default admin
    if (DEFAULT_EMAILS.includes(normalized)) return false;
    // Prevent removing last email
    if (_emailStore.size <= 1) return false;
    const hash = hashEmail(normalized);
    return _emailStore.delete(hash);
  },

  size: (): number => _emailStore.size,
};
