import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ALLOWED_EMAILS } from '../_store';

const ADMIN_EMAIL = 'marcos.vinicius@movingpay.com.br';

// Check admin from BOTH session types: manual (TOTP/Slack) and Auth.js (Google SSO)
export async function getSessionEmail(request: NextRequest): Promise<string | null> {
  // 1. Check manual session cookie (TOTP / Slack login)
  const manualSession = request.cookies.get('session')?.value;
  if (manualSession) {
    try {
      const payload = JSON.parse(Buffer.from(manualSession, 'base64').toString());
      if (payload.email && payload.exp && Date.now() < payload.exp) {
        return payload.email.trim().toLowerCase();
      }
    } catch {}
  }

  // 2. Check Auth.js session (Google SSO)
  try {
    const session = await auth();
    if (session?.user?.email) {
      return session.user.email.trim().toLowerCase();
    }
  } catch {}

  return null;
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  const email = await getSessionEmail(request);
  return email === ADMIN_EMAIL;
}

export { ADMIN_EMAIL };
