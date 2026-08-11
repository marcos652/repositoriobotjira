import { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

const ADMIN_EMAIL = 'marcos.vinicius@movingpay.com.br';

// Única fonte de verdade de "está logado": o cookie de sessão assinado, emitido
// só depois do 2º fator (TOTP) ser confirmado — ver /api/auth/totp. Uma sessão
// Auth.js (Google) válida, sozinha, NÃO conta como logado: falta o 2º fator.
export async function getSessionEmail(request: NextRequest): Promise<string | null> {
  const payload = verifySessionToken(request.cookies.get('session')?.value);
  return payload?.email || null;
}

import { ALLOWED_EMAILS } from './_store';

export async function isAdmin(request: NextRequest): Promise<boolean> {
  const email = await getSessionEmail(request);
  if (!email) return false;
  
  // Super admin fallback
  if (email === ADMIN_EMAIL) return true;
  
  // Check role in database
  const role = ALLOWED_EMAILS.getRole(email);
  const result = role === 'admin';
  console.log(`[Admin] isAdmin: email=${email}, role=${role}, admin=${result}`);
  return result;
}

export { ADMIN_EMAIL };
