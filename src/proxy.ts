import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from './app/api/auth/_store';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to sensitive files
  const blockedPaths = ['.env', '.env.local', '.env.production', '_store.ts', '_config.ts'];
  if (blockedPaths.some(p => pathname.includes(p))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Block access to source code directories
  if (pathname.startsWith('/src/') || pathname.endsWith('.ts') || pathname.endsWith('.tsx')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // API routes that don't need auth
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // ── Check Auth.js session (Google SSO) ──
  const authToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value;

  if (authToken) {
    // Auth.js session exists — allow through (Auth.js handles validation)
    return NextResponse.next();
  }

  // ── Check manual session cookie (Slack code login) ──
  const session = request.cookies.get('session')?.value;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(Buffer.from(session, 'base64').toString());

    if (!payload.email || !payload.iat || !payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    if (Date.now() > payload.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      console.warn(`[SECURITY] Blocked forged session for: ${normalizedEmail}`);
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    if (payload.iat > Date.now() + 60000) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
