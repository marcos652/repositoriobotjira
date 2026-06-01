import { NextRequest, NextResponse } from 'next/server';

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

    // Validate session structure
    if (!payload.email || !payload.iat || !payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    // Check session expiry
    if (Date.now() > payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    // Check for future-dated sessions (clock skew protection)
    if (payload.iat > Date.now() + 60000) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return addSecurityHeaders(response);
    }

    // Session is valid — the auth routes already verified the email
    // is in ALLOWED_EMAILS before creating this session
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

