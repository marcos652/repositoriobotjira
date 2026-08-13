import { NextRequest, NextResponse, after } from 'next/server';
import { ALLOWED_EMAILS, encrypt, decrypt, IP_TRACKER, TOTP_STORE, REQUEST_LOG_STORE } from '../_store';
import {
  createSessionToken,
  createTrustToken,
  verifyTrustToken,
  SESSION_TTL_MS,
  SESSION_TTL_SECONDS,
  TOTP_TRUST_COOKIE,
  TOTP_TRUST_TTL_SECONDS,
} from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// Código de 6 dígitos tem só 1 milhão de combinações — sem isso, dava pra
// tentar adivinhar por força bruta. 8 tentativas / 5 min por e-mail.
function checkTotpAttempts(email: string) {
  return checkRateLimit(`totp-code:${email}`, 8, 5 * 60_000);
}

// ── POST: Setup / Verify / Confirm TOTP ──
// 2º fator obrigatório depois de QUALQUER primeiro login (senha/Firebase OU Google
// SSO via Auth.js) — só depois de confirmado aqui é que a sessão real é emitida.
export async function POST(request: NextRequest) {
  try {
    const { email: inputEmail, action, code, setupToken, idToken } = await request.json();

    if (!inputEmail) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    const normalized = inputEmail.trim().toLowerCase();
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';

    // Dispara a sincronização com o Redis SEM esperar — ela não depende da
    // verificação de identidade abaixo, então roda em paralelo com ela (cada
    // ida-e-volta de rede custa ~150-300ms; em série isso passava de 1s).
    const syncPromise = Promise.all([ALLOWED_EMAILS.sync(), TOTP_STORE.sync(), IP_TRACKER.sync()]);

    // Prova de identidade do 1º fator: idToken do Firebase (login por senha) OU,
    // se ausente, a sessão Auth.js já estabelecida (login via Google SSO).
    let authEmail: string | null = null;
    if (idToken) {
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY || 'AIzaSyAGFdbWod_EJgh4OC056IvcqT621L9FWUo'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
        after(() => REQUEST_LOG_STORE.record({ method: 'POST', path: '/api/auth/totp', ip: clientIP, who: 'anonymous', identityType: 'anonymous', allowed: false }));
        return NextResponse.json({ error: 'Token inválido ou expirado. Faça login novamente.' }, { status: 401 });
      }
      authEmail = verifyData.users[0].email?.toLowerCase() || null;
    } else {
      const { auth } = await import('@/auth');
      const authSession = await auth();
      authEmail = authSession?.user?.email?.trim().toLowerCase() || null;
    }

    // Só agora precisamos do resultado do sync (pra checar ALLOWED_EMAILS/TOTP_STORE
    // adiante) — ele já rodou em paralelo com a verificação de identidade acima.
    await syncPromise;

    if (!authEmail) {
      after(() => REQUEST_LOG_STORE.record({ method: 'POST', path: '/api/auth/totp', ip: clientIP, who: 'anonymous', identityType: 'anonymous', allowed: false }));
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }
    if (authEmail !== normalized) {
      after(() => REQUEST_LOG_STORE.record({ method: 'POST', path: '/api/auth/totp', ip: clientIP, who: `${authEmail} (declarou ${normalized})`, identityType: 'anonymous', allowed: false }));
      return NextResponse.json({ error: 'Email incompatível com a credencial' }, { status: 403 });
    }

    // Identidade confirmada (1º fator válido) — registra pra rastreabilidade,
    // já que o proxy.ts não tem como saber quem é antes da sessão existir.
    // Via after(): não bloqueia a resposta com a ida-e-volta ao Redis.
    after(() => REQUEST_LOG_STORE.record({
      method: 'POST',
      path: '/api/auth/totp',
      ip: clientIP,
      who: normalized,
      identityType: 'user',
      allowed: true,
    }));

    if (!ALLOWED_EMAILS.includes(normalized)) {
      return NextResponse.json({ error: 'Email não autorizado. Contate o administrador.' }, { status: 403 });
    }

    if (ALLOWED_EMAILS.getStatus(normalized) === 'blocked') {
      return NextResponse.json({ error: 'Acesso bloqueado. Contate o administrador.' }, { status: 403 });
    }

    if (IP_TRACKER.isBlocked(clientIP, normalized)) {
      // Record the failed attempt so the admin can see it and unblock it
      await IP_TRACKER.record(normalized, clientIP, true);
      return NextResponse.json({ error: 'Acesso por IP não autorizado. Contate o administrador para liberação.' }, { status: 403 });
    }

    // ── ACTION: setup — Generate new TOTP secret ──
    if (action === 'setup' || !action) {
      // ── Dispositivo confiável: 2º fator já aprovado aqui nas últimas 5h ──
      // Só chega neste ponto quem JÁ provou o 1º fator acima (idToken do Firebase
      // ou sessão do Google). A marca de confiança nunca concede acesso sozinha —
      // ela só dispensa o SEGUNDO fator, e por isso é checada depois da
      // verificação de identidade, não antes.
      const trusted = verifyTrustToken(request.cookies.get(TOTP_TRUST_COOKIE)?.value);
      if (trusted && trusted.email === normalized && TOTP_STORE.has(normalized)) {
        await IP_TRACKER.record(normalized, clientIP);
        const response = NextResponse.json({
          success: true,
          trusted: true,
          message: 'Dispositivo já verificado. Login realizado!',
          user: { email: normalized },
        });
        response.cookies.set('session', createSessionToken({
          email: normalized,
          role: ALLOWED_EMAILS.getRole(normalized),
          iat: Date.now(),
          exp: Date.now() + SESSION_TTL_MS,
        }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_TTL_SECONDS,
          path: '/',
        });
        return response;
      }

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

      const attempts = checkTotpAttempts(normalized);
      if (!attempts.allowed) {
        return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
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

      // Save the secret using centralized store (persisted a arquivo + Redis)
      await TOTP_STORE.set(normalized, encrypt({ secret: tokenData.secret }));

      // Record IP
      await IP_TRACKER.record(normalized, clientIP);

      // Create session
      const role = ALLOWED_EMAILS.getRole(normalized);
      const issuedAt = Date.now();
      const sessionPayload = {
        email: normalized,
        role,
        iat: issuedAt,
        exp: issuedAt + SESSION_TTL_MS,
      };
      const sessionValue = createSessionToken(sessionPayload);

      const response = NextResponse.json({
        success: true,
        message: 'Authenticator configurado e login realizado!',
        user: { email: normalized },
      });

      response.cookies.set('session', sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SECONDS,
        path: '/',
      });

      // Marca este navegador como verificado por 5h. Sobrevive ao logout de
      // propósito: é o que evita repetir o código a cada entrada.
      response.cookies.set(TOTP_TRUST_COOKIE, createTrustToken(normalized), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOTP_TRUST_TTL_SECONDS,
        path: '/',
      });

      return response;
    }

    // ── ACTION: verify — Verify TOTP code for login ──
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });
      }

      const attempts = checkTotpAttempts(normalized);
      if (!attempts.allowed) {
        return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
      }

      const entry = TOTP_STORE.get(normalized);
      if (!entry) {
        return NextResponse.json({ error: 'Authenticator não configurado' }, { status: 400 });
      }

      // Decrypt the stored secret
      const secretData = decrypt<{ secret: string }>(entry.encryptedSecret);
      if (!secretData) {
        return NextResponse.json({ error: 'Erro na descriptografia do TOTP (chave inválida).' }, { status: 500 });
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
      await IP_TRACKER.record(normalized, clientIP);

      // Create session
      const role = ALLOWED_EMAILS.getRole(normalized);
      const issuedAt = Date.now();
      const sessionPayload = {
        email: normalized,
        role,
        iat: issuedAt,
        exp: issuedAt + SESSION_TTL_MS,
      };
      const sessionValue = createSessionToken(sessionPayload);

      const response = NextResponse.json({
        success: true,
        message: 'Login realizado!',
        user: { email: normalized },
      });

      response.cookies.set('session', sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SECONDS,
        path: '/',
      });

      // Marca este navegador como verificado por 5h. Sobrevive ao logout de
      // propósito: é o que evita repetir o código a cada entrada.
      response.cookies.set(TOTP_TRUST_COOKIE, createTrustToken(normalized), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOTP_TRUST_TTL_SECONDS,
        path: '/',
      });

      return response;
    }

    // Sem reset autoatendido aqui: apagar o próprio TOTP só com prova do 1º fator
    // (senha/Google) permitiria a qualquer um que só roubou a senha rearmar o 2º
    // fator pro próprio aparelho — anula o propósito do 2FA. Reset é só por admin,
    // via DELETE abaixo.

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('TOTP error:', error);
    return NextResponse.json({ error: 'Erro interno', details: error?.message || String(error), stack: error?.stack }, { status: 500 });
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
  const removed = await TOTP_STORE.remove(normalized);
  return NextResponse.json({ success: removed, message: removed ? `TOTP resetado para ${normalized}` : 'Nenhum TOTP encontrado' });
}
