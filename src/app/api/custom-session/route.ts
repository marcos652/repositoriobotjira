import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from '../auth/_store';
import { createSessionToken, verifySessionToken } from '@/lib/session';

// Criação da sessão (POST) foi movida pra /api/auth/totp — o cookie de sessão só
// existe depois que o 2º fator (TOTP) é confirmado, seja o 1º fator senha ou Google.

export async function GET(request: NextRequest) {
  const payload = verifySessionToken(request.cookies.get('session')?.value);

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dynamicRole = ALLOWED_EMAILS.getRole(payload.email);

  return NextResponse.json({
    authenticated: true,
    user: { email: payload.email, role: dynamicRole },
  });
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logout realizado' });
  response.cookies.delete('session');
  return response;
}

// Session refresh — renew if expiring within 2 hours
export async function PUT(request: NextRequest) {
  const payload = verifySessionToken(request.cookies.get('session')?.value);

  if (!payload) {
    return NextResponse.json({ error: 'Sem sessão ativa' }, { status: 401 });
  }

  // Renew session: extend by 30 days
  const newPayload = {
    ...payload,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  const newSession = createSessionToken(newPayload);
  const response = NextResponse.json({
    success: true,
    message: 'Sessão renovada',
    expiresAt: new Date(newPayload.exp).toISOString(),
  });
  response.cookies.set('session', newSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}

