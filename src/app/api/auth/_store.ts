import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
//  SECURE EMAIL STORAGE — File-Persisted
//  Uses globalThis to share across Next.js routes
//  Persists to JSON file so emails survive restarts
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

interface SecureEmail {
  hash: string;
  encrypted: string;
  addedAt: string;
  addedBy?: string;
}

const DEFAULT_EMAILS = [
  'marcos.vinicius@movingpay.com.br',
  'breno.martins@movingpay.com.br',
];

// ── File persistence ──
function getDataFilePath(): string {
  // Try project data dir first, then /tmp for Vercel
  const projectPath = path.join(process.cwd(), 'data', 'emails.json');
  const tmpPath = '/tmp/jiraops-emails.json';

  // Check if project data dir is writable
  try {
    const dataDir = path.dirname(projectPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // Test write
    fs.accessSync(dataDir, fs.constants.W_OK);
    return projectPath;
  } catch {
    return tmpPath;
  }
}

function loadEmailsFromFile(): Map<string, SecureEmail> {
  const store = new Map<string, SecureEmail>();

  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.hash && entry.encrypted) {
            store.set(entry.hash, entry);
          }
        }
      }
      console.log(`[Auth] Loaded ${store.size} emails from ${filePath}`);
    }
  } catch (e: any) {
    console.warn(`[Auth] Could not load emails file: ${e.message}`);
  }

  return store;
}

function saveEmailsToFile(store: Map<string, SecureEmail>): void {
  try {
    const filePath = getDataFilePath();
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = Array.from(store.values());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Auth] ✅ Saved ${data.length} emails to ${filePath}`);
  } catch (e: any) {
    console.error(`[Auth] ❌ FAILED to save emails: ${e.message}`);
    console.error(e.stack);
  }
}

// ── Use globalThis to share across Next.js API routes ──
const GLOBAL_KEY = '__jiraops_email_store__';
const GLOBAL_KEY_TS = '__jiraops_email_store_ts__';
const CACHE_TTL = 2000; // 2 second cache

function getStore(): Map<string, SecureEmail> {
  const g = globalThis as any;
  const now = Date.now();

  // Use cached store if it's fresh (within TTL)
  if (g[GLOBAL_KEY] && g[GLOBAL_KEY].size > 0 && g[GLOBAL_KEY_TS] && (now - g[GLOBAL_KEY_TS]) < CACHE_TTL) {
    return g[GLOBAL_KEY];
  }

  // Always reload from file (source of truth)
  const fileStore = loadEmailsFromFile();
  g[GLOBAL_KEY] = fileStore.size > 0 ? fileStore : new Map<string, SecureEmail>();
  g[GLOBAL_KEY_TS] = now;

  // Always ensure defaults are present
  let changed = false;
  for (const email of DEFAULT_EMAILS) {
    const hash = hashEmail(email);
    if (!g[GLOBAL_KEY].has(hash)) {
      g[GLOBAL_KEY].set(hash, {
        hash,
        encrypted: encryptEmail(email),
        addedAt: new Date().toISOString(),
        addedBy: 'system',
      });
      changed = true;
    }
  }

  // Also load from env var
  const envEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => e.length > 0 && e.includes('@'));

  for (const email of envEmails) {
    const hash = hashEmail(email);
    if (!g[GLOBAL_KEY].has(hash)) {
      g[GLOBAL_KEY].set(hash, {
        hash,
        encrypted: encryptEmail(email),
        addedAt: new Date().toISOString(),
        addedBy: 'env',
      });
      changed = true;
    }
  }

  // Save only if we added defaults/env
  if (changed) saveEmailsToFile(g[GLOBAL_KEY]);
  return g[GLOBAL_KEY];
}

// ── Public API ──
export const ALLOWED_EMAILS = {
  includes: (email: string): boolean => {
    const hash = hashEmail(email);
    return getStore().has(hash);
  },

  list: (): Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean }> => {
    const result: Array<{ email: string; addedAt: string; addedBy?: string; isDefault: boolean }> = [];
    for (const entry of getStore().values()) {
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

  add: (email: string, addedBy?: string): boolean => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) return false;
    const hash = hashEmail(normalized);
    const store = getStore();
    if (store.has(hash)) return false;
    store.set(hash, {
      hash,
      encrypted: encryptEmail(normalized),
      addedAt: new Date().toISOString(),
      addedBy: addedBy || 'admin',
    });
    saveEmailsToFile(store); // Persist!
    (globalThis as any)[GLOBAL_KEY_TS] = 0; // Invalidate cache
    console.log(`[Auth] Added email: ${normalized.slice(0, 3)}***`);
    return true;
  },

  remove: (email: string): boolean => {
    const normalized = email.trim().toLowerCase();
    if (DEFAULT_EMAILS.includes(normalized)) return false;
    const store = getStore();
    if (store.size <= 1) return false;
    const hash = hashEmail(normalized);
    const removed = store.delete(hash);
    if (removed) {
      saveEmailsToFile(store); // Persist!
      (globalThis as any)[GLOBAL_KEY_TS] = 0; // Invalidate cache
      console.log(`[Auth] Removed email: ${normalized.slice(0, 3)}***`);
    }
    return removed;
  },

  size: (): number => getStore().size,
};

// ═══════════════════════════════════════════
//  IP TRACKER — Records & blocks IPs
// ═══════════════════════════════════════════

interface IPEntry {
  ip: string;
  email: string;
  firstSeen: string;
  lastSeen: string;
  blocked: boolean;
  loginCount: number;
}

const GLOBAL_IP_KEY = '__jiraops_ip_store__';

function getIPFilePath(): string {
  const projectPath = path.join(process.cwd(), 'data', 'ips.json');
  const tmpPath = '/tmp/jiraops-ips.json';
  try {
    const dataDir = path.dirname(projectPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    return projectPath;
  } catch {
    return tmpPath;
  }
}

function getIPStore(): Map<string, IPEntry> {
  const g = globalThis as any;
  if (!g[GLOBAL_IP_KEY] || g[GLOBAL_IP_KEY].size === 0) {
    g[GLOBAL_IP_KEY] = new Map<string, IPEntry>();
    try {
      const filePath = getIPFilePath();
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          for (const entry of data) {
            const key = `${entry.email}:${entry.ip}`;
            g[GLOBAL_IP_KEY].set(key, entry);
          }
        }
        console.log(`[IP] Loaded ${g[GLOBAL_IP_KEY].size} entries from ${filePath}`);
      }
    } catch {}
  }
  return g[GLOBAL_IP_KEY];
}

function saveIPStore(): void {
  try {
    const store = getIPStore();
    const filePath = getIPFilePath();
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Array.from(store.values()), null, 2), 'utf-8');
  } catch {}
}

export const IP_TRACKER = {
  /** Record a login from an IP */
  record: (email: string, ip: string): void => {
    const normalized = email.trim().toLowerCase();
    const cleanIP = ip.replace('::ffff:', ''); // Normalize IPv4-mapped IPv6
    const key = `${normalized}:${cleanIP}`;
    const store = getIPStore();
    const existing = store.get(key);
    if (existing) {
      existing.lastSeen = new Date().toISOString();
      existing.loginCount++;
    } else {
      store.set(key, {
        ip: cleanIP,
        email: normalized,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        blocked: false,
        loginCount: 1,
      });
    }
    saveIPStore();
    console.log(`[IP] Recorded login: ${normalized.slice(0, 3)}*** from ${cleanIP}`);
  },

  /** Check if an IP is blocked for a specific email (or globally if no email given) */
  isBlocked: (ip: string, email?: string): boolean => {
    const cleanIP = ip.replace('::ffff:', '');
    if (email) {
      const key = `${email.trim().toLowerCase()}:${cleanIP}`;
      const entry = getIPStore().get(key);
      return entry?.blocked ?? false;
    }
    // If no email, check if ANY entry for this IP is blocked
    for (const entry of getIPStore().values()) {
      if (entry.ip === cleanIP && entry.blocked) return true;
    }
    return false;
  },

  /** Block a specific email:ip combination */
  block: (ip: string, email?: string): boolean => {
    const cleanIP = ip.replace('::ffff:', '');
    const store = getIPStore();
    let found = false;
    if (email) {
      // Block only the specific email:ip combo
      const key = `${email.trim().toLowerCase()}:${cleanIP}`;
      const entry = store.get(key);
      if (entry) {
        entry.blocked = true;
        found = true;
      }
    } else {
      // Legacy: block all entries with this IP
      for (const [key, entry] of store) {
        if (entry.ip === cleanIP) {
          entry.blocked = true;
          found = true;
        }
      }
    }
    if (found) saveIPStore();
    return found;
  },

  /** Unblock a specific email:ip combination */
  unblock: (ip: string, email?: string): boolean => {
    const cleanIP = ip.replace('::ffff:', '');
    const store = getIPStore();
    let found = false;
    if (email) {
      const key = `${email.trim().toLowerCase()}:${cleanIP}`;
      const entry = store.get(key);
      if (entry) {
        entry.blocked = false;
        found = true;
      }
    } else {
      for (const [key, entry] of store) {
        if (entry.ip === cleanIP) {
          entry.blocked = false;
          found = true;
        }
      }
    }
    if (found) saveIPStore();
    return found;
  },

  /** List all IP records */
  list: (): IPEntry[] => {
    return Array.from(getIPStore().values());
  },

  /** Add a new IP entry manually */
  add: (email: string, ip: string): boolean => {
    const normalized = email.trim().toLowerCase();
    const cleanIP = ip.replace('::ffff:', '').trim();
    if (!normalized || !cleanIP) return false;
    const key = `${normalized}:${cleanIP}`;
    const store = getIPStore();
    if (store.has(key)) return false;
    store.set(key, {
      ip: cleanIP,
      email: normalized,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      blocked: false,
      loginCount: 0,
    });
    saveIPStore();
    console.log(`[IP] Manually added: ${normalized.slice(0, 3)}*** → ${cleanIP}`);
    return true;
  },

  /** Update an IP entry (change IP or email) */
  update: (oldEmail: string, oldIP: string, newEmail?: string, newIP?: string): boolean => {
    const store = getIPStore();
    const cleanOldIP = oldIP.replace('::ffff:', '').trim();
    const oldKey = `${oldEmail.trim().toLowerCase()}:${cleanOldIP}`;
    const entry = store.get(oldKey);
    if (!entry) return false;

    const updatedEmail = (newEmail || oldEmail).trim().toLowerCase();
    const updatedIP = (newIP || oldIP).replace('::ffff:', '').trim();
    const newKey = `${updatedEmail}:${updatedIP}`;

    // Remove old entry
    store.delete(oldKey);
    // Set updated entry
    store.set(newKey, {
      ...entry,
      ip: updatedIP,
      email: updatedEmail,
    });
    saveIPStore();
    console.log(`[IP] Updated: ${oldKey} → ${newKey}`);
    return true;
  },

  /** Remove an IP entry */
  remove: (email: string, ip: string): boolean => {
    const store = getIPStore();
    const cleanIP = ip.replace('::ffff:', '').trim();
    const key = `${email.trim().toLowerCase()}:${cleanIP}`;
    const removed = store.delete(key);
    if (removed) {
      saveIPStore();
      console.log(`[IP] Removed: ${key}`);
    }
    return removed;
  },
};

// ═══════════════════════════════════════════
//  TOTP STORE — Persisted TOTP secrets
//  File is source of truth, with 2s in-memory cache
// ═══════════════════════════════════════════

interface TOTPEntry {
  emailHash: string;
  encryptedSecret: string;
  createdAt: string;
}

const GLOBAL_TOTP_KEY = '__jiraops_totp_store__';
const GLOBAL_TOTP_TS = '__jiraops_totp_store_ts__';
const TOTP_CACHE_TTL = 2000;

function getTOTPFilePath(): string {
  const projectPath = path.join(process.cwd(), 'data', 'totp.json');
  const tmpPath = '/tmp/jiraops-totp.json';
  try {
    const dataDir = path.dirname(projectPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    return projectPath;
  } catch {
    return tmpPath;
  }
}

function loadTOTPFromFile(): Map<string, TOTPEntry> {
  const store = new Map<string, TOTPEntry>();
  try {
    const filePath = getTOTPFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.emailHash) {
            store.set(entry.emailHash, entry);
          }
        }
      }
    }
  } catch (e: any) {
    console.warn(`[TOTP] Could not load file: ${e.message}`);
  }
  return store;
}

function getTOTPStore(): Map<string, TOTPEntry> {
  const g = globalThis as any;
  const now = Date.now();

  // Use cached store if fresh
  if (g[GLOBAL_TOTP_KEY] && g[GLOBAL_TOTP_KEY].size > 0 && g[GLOBAL_TOTP_TS] && (now - g[GLOBAL_TOTP_TS]) < TOTP_CACHE_TTL) {
    return g[GLOBAL_TOTP_KEY];
  }

  // Always reload from file (source of truth)
  const fileStore = loadTOTPFromFile();
  g[GLOBAL_TOTP_KEY] = fileStore.size > 0 ? fileStore : (g[GLOBAL_TOTP_KEY] || new Map<string, TOTPEntry>());
  g[GLOBAL_TOTP_TS] = now;
  return g[GLOBAL_TOTP_KEY];
}

function saveTOTPStore(): void {
  try {
    const store = (globalThis as any)[GLOBAL_TOTP_KEY];
    if (!store) return;
    const filePath = getTOTPFilePath();
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Array.from(store.values()), null, 2), 'utf-8');
    // Invalidate cache so next read gets fresh data
    (globalThis as any)[GLOBAL_TOTP_TS] = 0;
    console.log(`[TOTP] ✅ Saved ${store.size} entries to ${filePath}`);
  } catch (e: any) {
    console.error(`[TOTP] ❌ Failed to save: ${e.message}`);
  }
}

function totpEmailHash(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase() + ':totp-salt').digest('hex');
}

export const TOTP_STORE = {
  /** Check if user has TOTP configured */
  has: (email: string): boolean => {
    const hash = totpEmailHash(email);
    return getTOTPStore().has(hash);
  },

  /** Get TOTP entry for user */
  get: (email: string): TOTPEntry | undefined => {
    const hash = totpEmailHash(email);
    return getTOTPStore().get(hash);
  },

  /** Save TOTP secret for user */
  set: (email: string, encryptedSecret: string): void => {
    const hash = totpEmailHash(email);
    const store = getTOTPStore();
    store.set(hash, {
      emailHash: hash,
      encryptedSecret,
      createdAt: new Date().toISOString(),
    });
    saveTOTPStore();
    console.log(`[TOTP] Configured for ${email.slice(0, 3)}***`);
  },

  /** Remove TOTP for user (reset) */
  remove: (email: string): boolean => {
    const hash = totpEmailHash(email);
    const store = getTOTPStore();
    const removed = store.delete(hash);
    if (removed) saveTOTPStore();
    return removed;
  },

  /** Get email hash */
  hash: (email: string): string => totpEmailHash(email),
};

