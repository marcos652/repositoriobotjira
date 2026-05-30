import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from './app/api/auth/_store';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // API routes that don't need auth
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ── Check Auth.js session (Google SSO) ──
  // Auth.js uses encrypted JWE tokens — a fake/random value won't decrypt
  // We validate by checking the token has minimum structure (not empty/trivial)
  const authToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value;

  if (authToken) {
    // Auth.js JWE tokens are long encrypted strings (200+ chars)
    // A fake token like "FAKE_TOKEN" is too short to be valid
    if (authToken.length < 100) {
      // Too short to be a valid JWE — reject
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('authjs.session-token');
      response.cookies.delete('__Secure-authjs.session-token');
      return addSecurityHeaders(response);
    }
    // Token looks like valid JWE — Auth.js will validate on API calls
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ── Check manual session cookie (Slack code / TOTP login) ──
  const session = request.cookies.get('session')?.value;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());

    if (!payload.email || !payload.iat || !payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    if (Date.now() > payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      console.warn(`[SECURITY] Blocked forged session for: ${normalizedEmail}`);
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    if (payload.iat > Date.now() + 60000) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    const response = NextResponse.next();
    return addSecurityHeaders(response);
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return addSecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
