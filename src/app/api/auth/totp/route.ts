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
import { getRedisClient } from '@/lib/redis';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// Código de 6 dígitos tem só 1 milhão de combinações — sem isso, dava pra
// tentar adivinhar por força bruta. 8 tentativas / 5 min por e-mail.
function checkTotpAttempts(email: string) {
  return checkRateLimit(`totp-code:${email}`, 8, 5 * 60_000);
}

// ── Cadastro de TOTP em andamento ──
// Guarda o segredo enquanto a pessoa escaneia o QR e digita o primeiro código, para que
// recarregar a página não troque o segredo debaixo dela. Vida curta (10 min, o mesmo prazo
// do setupToken) e apagado assim que o cadastro conclui. Redis com queda para memória:
// em dev local sem Upstash, ainda funciona dentro da mesma instância.
const SETUP_PENDENTE_TTL_S = 10 * 60;
const GLOBAL_SETUP_PENDENTE = '__jiraops_totp_setup_pendente__';

function chaveSetupPendente(email: string) {
  return `jiraops:totp-setup-pendente:${TOTP_STORE.hash(email)}`;
}

function memPendentes(): Map<string, { secret: string; exp: number }> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_SETUP_PENDENTE]) g[GLOBAL_SETUP_PENDENTE] = new Map();
  return g[GLOBAL_SETUP_PENDENTE] as Map<string, { secret: string; exp: number }>;
}

async function lerSetupPendente(email: string): Promise<string | null> {
  const chave = chaveSetupPendente(email);

  const local = memPendentes().get(chave);
  if (local && local.exp > Date.now()) return local.secret;

  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const s = await redis.get<string>(chave);
    return typeof s === 'string' && s.length > 0 ? s : null;
  } catch (e) {
    console.error('[TOTP] Falha ao ler cadastro pendente:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function gravarSetupPendente(email: string, secretBase32: string): Promise<void> {
  const chave = chaveSetupPendente(email);
  memPendentes().set(chave, { secret: secretBase32, exp: Date.now() + SETUP_PENDENTE_TTL_S * 1000 });

  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(chave, secretBase32, { ex: SETUP_PENDENTE_TTL_S });
  } catch (e) {
    console.error('[TOTP] Falha ao gravar cadastro pendente:', e instanceof Error ? e.message : e);
  }
}

async function limparSetupPendente(email: string): Promise<void> {
  const chave = chaveSetupPendente(email);
  memPendentes().delete(chave);

  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(chave);
  } catch {
    // TTL de 10 min limpa sozinho; falhar aqui não é problema.
  }
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
      // Reaproveita o segredo de um cadastro em andamento, em vez de sortear um novo a
      // cada chamada. Sem isso, recarregar a página (ou refazer o login) gerava OUTRO
      // segredo e OUTRO QR: quem já tinha escaneado o primeiro ficava com uma entrada no
      // Authenticator que o servidor não valida mais — e, como o rótulo é idêntico
      // ("JiraOps Dashboard: email"), a pessoa não tem como saber qual das entradas é a
      // atual. O sintoma era "Código incorreto" para sempre, com o código certo na tela.
      const segredoPendente = await lerSetupPendente(normalized);
      const secret = segredoPendente
        ? OTPAuth.Secret.fromBase32(segredoPendente)
        : new OTPAuth.Secret({ size: 20 });

      const totp = new OTPAuth.TOTP({
        issuer: 'JiraOps Dashboard',
        label: normalized,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      if (!segredoPendente) await gravarSetupPendente(normalized, secret.base32);

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

      // window: 2 = tolera ±60s de diferença entre o relógio do celular e o do servidor.
      // Com ±30s, um celular levemente adiantado falhava com o código correto na tela.
      const delta = totp.validate({ token: code.trim(), window: 2 });
      if (delta === null) {
        // A mensagem diz o que fazer: a causa mais comum aqui não é digitar errado, é o
        // Authenticator ter uma entrada "JiraOps Dashboard" de uma tentativa anterior. Como
        // o rótulo é idêntico, a pessoa lê o código da entrada velha sem perceber.
        return NextResponse.json(
          {
            error: 'Código incorreto. Se você já havia escaneado um QR code antes, apague a entrada antiga "JiraOps Dashboard" do Authenticator e escaneie o QR que está nesta tela.',
          },
          { status: 401 }
        );
      }

      // Save the secret using centralized store (persisted a arquivo + Redis)
      await TOTP_STORE.set(normalized, encrypt({ secret: tokenData.secret }));
      // Cadastro concluído: o segredo pendente não serve mais para nada.
      await limparSetupPendente(normalized);

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
  // Também descarta um cadastro em andamento: resetar significa "comece de zero", e
  // reaproveitar o segredo pendente faria a pessoa receber o MESMO QR de antes.
  await limparSetupPendente(normalized);
  console.log(`[TOTP] Reset administrativo para ${normalized} (havia cadastro: ${removed})`);
  return NextResponse.json({ success: removed, message: removed ? `TOTP resetado para ${normalized}` : 'Nenhum TOTP encontrado' });
}
