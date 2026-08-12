import { NextRequest, NextResponse, after, type NextFetchEvent } from 'next/server';
import { IP_TRACKER, ALLOWED_EMAILS, REQUEST_LOG_STORE } from './app/api/auth/_store';
import { getSessionEmail } from './app/api/auth/_admin';
import { checkRateLimit } from './lib/rateLimit';

// Rotas que chamam IA por requisição — custam dinheiro de verdade por chamada,
// por isso têm um limite bem mais apertado que o resto da API.
const AI_ROUTES = ['/api/criar-demanda', '/api/aprimorar-texto'];

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

// Verdadeiro se o usuário foi bloqueado (por status da conta OU por IP banido) —
// checado em toda requisição, não só no login, para cortar sessões já ativas.
function isBlockedNow(request: NextRequest, email: string | null): boolean {
  if (!email) return false;
  if (ALLOWED_EMAILS.getStatus(email) === 'blocked') return true;
  return IP_TRACKER.isBlocked(getClientIP(request), email);
}

function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Acesso bloqueado. Contate o administrador.' },
    { status: 403 }
  );
}

// Token de serviço para chamadas máquina-a-máquina (ex: automação/bot externo).
// Aceito via "Authorization: Bearer <token>" ou "x-api-key: <token>".
function getServiceToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && /^bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^bearer\s+/i, '').trim();
  }
  return request.headers.get('x-api-key');
}

type ApiIdentity = {
  who: string;
  identityType: 'service' | 'user' | 'anonymous';
  authorized: boolean;
};

// Resolve quem está fazendo a chamada (jirabot via token de serviço, usuário via
// sessão, ou anônimo) — usado tanto para autorizar quanto para logar a requisição.
async function resolveApiIdentity(request: NextRequest): Promise<ApiIdentity> {
  const expectedToken = process.env.JIRABOT_SERVICE_TOKEN;
  if (expectedToken) {
    const presented = getServiceToken(request);
    if (presented && presented === expectedToken) {
      return { who: 'jirabot', identityType: 'service', authorized: true };
    }
  }

  const email = await getSessionEmail(request);
  if (email) {
    return { who: email, identityType: 'user', authorized: !isBlockedNow(request, email) };
  }

  return { who: 'anonymous', identityType: 'anonymous', authorized: false };
}

export async function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── Security headers ──
  const addSecurityHeaders = (response: NextResponse) => {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return response;
  };

  // Block access to sensitive files and directories
  const blockedPaths = ['.env', '.env.local', '.env.production', '_store.ts', '_config.ts'];
  if (blockedPaths.some(p => pathname.includes(p))) {
    return addSecurityHeaders(new NextResponse('Not Found', { status: 404 }));
  }

  // Block access to data directory (encrypted emails, TOTP secrets)
  if (pathname.startsWith('/data/') || pathname.startsWith('/data')) {
    return addSecurityHeaders(new NextResponse('Not Found', { status: 404 }));
  }

  // Block access to source code directories and sensitive file types
  if (pathname.startsWith('/src/') || pathname.endsWith('.ts') || pathname.endsWith('.tsx') || pathname.endsWith('.json')) {
    return addSecurityHeaders(new NextResponse('Not Found', { status: 404 }));
  }

  // ── Rastreabilidade + autorização + rate limit de toda a API ──
  // Toda chamada a /api/* (leitura e escrita) é registrada (quem, IP, rota,
  // permitida ou não). Fora de /api/auth/* (que tem seu próprio fluxo de login
  // e checagem de admin internas), só passa quem tiver sessão válida ou o
  // token de serviço do jirabot — inclusive GET, que antes ficava sempre aberto.
  const isGatedApiCall = pathname.startsWith('/api/') && !['HEAD', 'OPTIONS'].includes(method);
  if (isGatedApiCall) {
    const ip = getClientIP(request);
    const identity = await resolveApiIdentity(request);
    // /api/custom-session faz parte do próprio fluxo de login (POST cria a sessão a
    // partir do ID token do Firebase, antes de existir qualquer cookie) — mesmo
    // tratamento de /api/auth/*: autoverificação interna, não passa pelo gate aqui.
    const isAuthRoute = pathname.startsWith('/api/auth') || pathname === '/api/custom-session';
    const authBlocked = !isAuthRoute && !identity.authorized;

    // Limite geral por identidade (usuário/jirabot autenticado) ou por IP (quem
    // ainda não tem identidade) — 120 chamadas/min. Rotas de IA (custam $ por
    // chamada) têm limite bem mais apertado, específico, por cima desse.
    const rlKey = identity.who !== 'anonymous' ? `id:${identity.who}` : `ip:${ip}`;
    const generalRl = checkRateLimit(rlKey, 120, 60_000);
    let rateLimited = !generalRl.allowed;
    if (!rateLimited && AI_ROUTES.includes(pathname)) {
      const aiRl = checkRateLimit(`ai:${rlKey}`, 10, 60_000);
      rateLimited = !aiRl.allowed;
    }

    const blocked = authBlocked || rateLimited;
    const blockLabel = authBlocked ? 'UNAUTHORIZED' : rateLimited ? 'RATE_LIMITED' : 'ALLOWED';

    console.log(`[API-TRACE] ${blocked ? `BLOCKED(${blockLabel})` : 'ALLOWED'} ${method} ${pathname} who=${identity.who} (${identity.identityType}) ip=${ip}`);
    // Rotas de login antes de existir sessão (ex: /api/auth/totp) nunca aparecem
    // como identidade real aqui — o proxy só vê cookies, não o corpo da requisição.
    // Nesses casos a própria rota sabe quem é (valida por idToken/sessão Auth.js) e
    // registra o e-mail real sozinha; registrar "anonymous" aqui só criaria ruído.
    const skipLog = isAuthRoute && identity.identityType === 'anonymous';
    if (!skipLog) {
      // Grava local (arquivo, cache rápido) e no Redis (durável entre
      // instâncias/deploys) — usado pelo painel "Requisições na API". Via
      // after(): roda toda ida-e-volta ao Redis SEM atrasar a resposta —
      // isso corre em TODA chamada de API, então bloquear aqui somaria
      // ~250-400ms em cada requisição da aplicação inteira.
      after(() => REQUEST_LOG_STORE.record({
        method,
        path: pathname,
        ip,
        who: identity.who,
        identityType: identity.identityType,
        allowed: !blocked,
      }));
    }

    if (authBlocked) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Não autorizado.' },
        { status: 401 }
      ));
    }
    if (rateLimited) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Muitas requisições. Aguarde um pouco e tente de novo.' },
        { status: 429 }
      ));
    }
  }

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Chegou até aqui já autorizada pelo gate acima — só deixa passar pra rota.
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ── Etapa final: cookie de sessão assinado ──
  // Só existe depois que o 2º fator (TOTP) foi confirmado (ver /api/auth/totp) —
  // é a única coisa que concede acesso completo ao painel e à API.
  const sessionEmail = await getSessionEmail(request);
  if (sessionEmail) {
    if (isBlockedNow(request, sessionEmail)) {
      return addSecurityHeaders(forbiddenResponse());
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ── Google SSO feito, mas 2º fator (TOTP) ainda pendente ──
  const authToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value;

  if (authToken) {
    if (authToken.length < 100) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('authjs.session-token');
      response.cookies.delete('__Secure-authjs.session-token');
      return addSecurityHeaders(response);
    }

    let ssoEmail: string | null = null;
    try {
      const { auth } = await import('./auth');
      const authSession = await auth();
      ssoEmail = authSession?.user?.email?.trim().toLowerCase() || null;
    } catch {}

    if (ssoEmail) {
      if (isBlockedNow(request, ssoEmail)) {
        return addSecurityHeaders(forbiddenResponse());
      }
      // /login já é público (ver publicRoutes acima) — é lá que o passo de TOTP
      // é exibido, então toda outra rota redireciona pra lá com esse sinal.
      const mfaUrl = new URL('/login', request.url);
      mfaUrl.searchParams.set('mfa', 'pending');
      return addSecurityHeaders(NextResponse.redirect(mfaUrl));
    }
  }

  // ── Nenhuma sessão válida ──
  const loginUrl = new URL('/login', request.url);
  return addSecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};

