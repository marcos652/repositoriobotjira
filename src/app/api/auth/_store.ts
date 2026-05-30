// Shared auth store using globalThis to survive module reloads in dev
// This ensures send-code and verify-code share the same Map instance

interface CodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

// Use globalThis to persist across hot reloads in dev
const globalStore = globalThis as typeof globalThis & {
  __authCodeStore?: Map<string, CodeEntry>;
};

if (!globalStore.__authCodeStore) {
  globalStore.__authCodeStore = new Map<string, CodeEntry>();
}

export const codeStore = globalStore.__authCodeStore;

// Allowed emails (add all authorized users here)
export const ALLOWED_EMAILS = [
  'marcos.vinicius@movingpay.com.br',
  // Add more authorized emails as needed
];
