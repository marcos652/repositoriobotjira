import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, encrypt, decrypt, IP_TRACKER } from '../_store';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// ── TOTP Secret Storage (file-persisted + globalThis) ──
const GLOBAL_TOTP_KEY = '__jiraops_totp_store__';

interface TOTPEntry {
  emailHash: string;
  encryptedSecret: string;
  createdAt: string;
}

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

function getTOTPStore(): Map<string, TOTPEntry> {
  const g = globalThis as any;
  if (!g[GLOBAL_TOTP_KEY]) {
    g[GLOBAL_TOTP_KEY] = new Map<string, TOTPEntry>();
    // Load from file
    try {
      const filePath = getTOTPFilePath();
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          for (const entry of data) {
            g[GLOBAL_TOTP_KEY].set(entry.emailHash, entry);
          }
        }
      }
    } catch {}
  }
  return g[GLOBAL_TOTP_KEY];
}

function saveTOTPStore(): void {
  try {
    const store = getTOTPStore();
    const filePath = getTOTPFilePath();
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Array.from(store.values()), null, 2), 'utf-8');
  } catch {}
}

function emailToHash(email: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email.trim().toLowerCase() + ':totp-salt').digest('hex');
}

// ── POST: Setup TOTP (generate secret + QR code) ──
// Body: { email }
// Returns: { qrCode (base64 image), secret (for manual entry), setupToken }
export async function POST(request: NextRequest) {
  try {
    const { email, action, code, setupToken } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Email não autorizado' }, { status: 403 });
    }

    // Check if IP is blocked
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';

    if (IP_TRACKER.isBlocked(clientIP)) {
      return NextResponse.json({ error: 'Acesso bloqueado. Contate o administrador.' }, { status: 403 });
    }

    const hash = emailToHash(normalized);
    const store = getTOTPStore();

    // ── ACTION: setup — Generate new TOTP secret ──
    if (action === 'setup' || !action) {
      // Check if already has TOTP configured
      if (store.has(hash)) {
        return NextResponse.json({
          configured: true,
          message: 'Authenticator já configurado. Digite o código.',
        });
      }

      // Generate new secret
      const totp = new OTPAuth.TOTP({
        issuer: 'JiraOps Dashboard',
        label: normalized,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const qrDataUrl = await QRCode.toDataURL(totp.toString(), {
        width: 280,
        margin: 2,
        color: { dark: '#F8FAFC', light: '#0F172A' },
      });

      // Encrypt secret and create a setup token
      const secretBase32 = totp.secret.base32;
      const setupTokenData = encrypt({
        email: normalized,
        secret: secretBase32,
        exp: Date.now() + 10 * 60 * 1000, // 10 min to complete setup
      });

      return NextResponse.json({
        configured: false,
        qrCode: qrDataUrl,
        secret: secretBase32, // For manual entry
        setupToken: setupTokenData,
        message: 'Escaneie o QR code com o Google Authenticator',
      });
    }

    // ── ACTION: confirm-setup — Verify first code and save secret ──
    if (action === 'confirm-setup') {
      if (!code || !setupToken) {
        return NextResponse.json({ error: 'Código e token são obrigatórios' }, { status: 400 });
      }

      const tokenData = decrypt<{ email: string; secret: string; exp: number }>(setupToken);
      if (!tokenData || tokenData.email !== normalized || Date.now() > tokenData.exp) {
        return NextResponse.json({ error: 'Token expirado. Refaça o setup.' }, { status: 400 });
      }

      // Verify the code
      const totp = new OTPAuth.TOTP({
        issuer: 'JiraOps Dashboard',
        label: normalized,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(tokenData.secret),
      });

      const delta = totp.validate({ token: code.trim(), window: 1 });
      if (delta === null) {
        return NextResponse.json({ error: 'Código incorreto. Tente novamente.' }, { status: 401 });
      }

      // Save the secret (encrypted)
      store.set(hash, {
        emailHash: hash,
        encryptedSecret: encrypt({ secret: tokenData.secret }),
        createdAt: new Date().toISOString(),
      });
      saveTOTPStore();

      // Record IP
      IP_TRACKER.record(normalized, clientIP);

      // Create session
      const sessionPayload = {
        email: normalized,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

      const response = NextResponse.json({
        success: true,
        message: 'Authenticator configurado e login realizado!',
        user: { email: normalized },
      });

      response.cookies.set('session', sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // ── ACTION: verify — Verify TOTP code for login ──
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });
      }

      const entry = store.get(hash);
      if (!entry) {
        return NextResponse.json({ error: 'Authenticator não configurado' }, { status: 400 });
      }

      // Decrypt the stored secret
      const secretData = decrypt<{ secret: string }>(entry.encryptedSecret);
      if (!secretData) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
      }

      const totp = new OTPAuth.TOTP({
        issuer: 'JiraOps Dashboard',
        label: normalized,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretData.secret),
      });

      const delta = totp.validate({ token: code.trim(), window: 1 });
      if (delta === null) {
        return NextResponse.json({ error: 'Código incorreto' }, { status: 401 });
      }

      // Record IP
      IP_TRACKER.record(normalized, clientIP);

      // Create session
      const sessionPayload = {
        email: normalized,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

      const response = NextResponse.json({
        success: true,
        message: 'Login realizado!',
        user: { email: normalized },
      });

      response.cookies.set('session', sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('TOTP error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
