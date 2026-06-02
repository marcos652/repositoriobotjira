import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS, encrypt, decrypt, IP_TRACKER, TOTP_STORE } from '../_store';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// ── POST: Setup / Verify / Confirm TOTP ──
export async function POST(request: NextRequest) {
  try {
    const { email, action, code, setupToken, idToken } = await request.json();

    if (!email || !idToken) {
      return NextResponse.json({ error: 'Email e Token obrigatórios' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Verify Firebase ID Token via REST API
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY || 'AIzaSyAGFdbWod_EJgh4OC056IvcqT621L9FWUo'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return NextResponse.json({ error: 'Token inválido ou expirado. Faça login novamente.' }, { status: 401 });
    }

    const authEmail = verifyData.users[0].email?.toLowerCase();
    if (authEmail !== normalized) {
      return NextResponse.json({ error: 'Email incompatível com a credencial' }, { status: 403 });
    }

    // Check if IP is blocked
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';

    if (IP_TRACKER.isBlocked(clientIP, normalized)) {
      return NextResponse.json({ error: 'Acesso bloqueado. Contate o administrador.' }, { status: 403 });
    }

    // ── ACTION: setup — Generate new TOTP secret ──
    if (action === 'setup' || !action) {
      // Check if already has TOTP configured (uses centralized persisted store)
      if (TOTP_STORE.has(normalized)) {
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

      // Save the secret using centralized store (persisted to file!)
      TOTP_STORE.set(normalized, encrypt({ secret: tokenData.secret }));

      // Record IP
      IP_TRACKER.record(normalized, clientIP);

      // Create session
      const sessionPayload = {
        email: normalized,
        iat: Date.now(),
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // ── ACTION: verify — Verify TOTP code for login ──
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });
      }

      const entry = TOTP_STORE.get(normalized);
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
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // ── ACTION: reset — Remove TOTP for re-setup ──
    if (action === 'reset') {
      TOTP_STORE.remove(normalized);
      return NextResponse.json({ success: true, message: 'TOTP resetado. Faça login para configurar novamente.' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('TOTP error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: Admin reset TOTP for a user
export async function DELETE(request: NextRequest) {
  const { isAdmin } = await import('../_admin');
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
  }
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
  const normalized = email.trim().toLowerCase();
  const removed = TOTP_STORE.remove(normalized);
  return NextResponse.json({ success: removed, message: removed ? `TOTP resetado para ${normalized}` : 'Nenhum TOTP encontrado' });
}
