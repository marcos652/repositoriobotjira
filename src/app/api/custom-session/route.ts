import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAILS } from '../auth/_store';
import { createSessionToken, verifySessionToken, SESSION_TTL_MS } from '@/lib/session';

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

// Reemissão do cookie de sessão — chamado pelo dashboard a cada navegação
// (ver useSessionAutoRefresh em src/app/dashboard/layout.tsx).
//
// NÃO estende o prazo: a sessão vale 5h a partir do LOGIN (absoluta), então o
// teto é sempre iat + SESSION_TTL_MS. Antes daqui saía "+30 dias a cada chamada",
// o que na prática tornava a sessão eterna para quem usa o painel — e faria o
// prazo de 5h nunca acontecer. O que este endpoint ainda resolve é manter o
// maxAge do cookie no browser alinhado ao exp assinado, encurtando junto.
export async function PUT(request: NextRequest) {
  try {
    const payload = verifySessionToken(request.cookies.get('session')?.value);

    if (!payload) {
      return NextResponse.json({ error: 'Sem sessão ativa' }, { status: 401 });
    }

    // Sem iat (cookie de formato antigo) não há como saber quando o login ocorreu,
    // então falha fechado: pede login novo em vez de arriscar estender sem limite.
    const absoluteExp = (payload.iat || 0) + SESSION_TTL_MS;
    const remainingMs = absoluteExp - Date.now();
    if (remainingMs <= 0) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    const newSession = createSessionToken({ ...payload, exp: absoluteExp });
    const response = NextResponse.json({
      success: true,
      message: 'Sessão revalidada',
      expiresAt: new Date(absoluteExp).toISOString(),
      remainingSeconds: Math.floor(remainingMs / 1000),
    });
    response.cookies.set('session', newSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.floor(remainingMs / 1000),
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    // Sem isto o erro subia como 500 de corpo vazio, e o auto-refresh do dashboard
    // (que engole falhas com .catch) fazia a sessão morrer sem nenhum rastro.
    console.error('[custom-session PUT]', error);
    return NextResponse.json({ error: 'Erro ao revalidar a sessão' }, { status: 500 });
  }
}

