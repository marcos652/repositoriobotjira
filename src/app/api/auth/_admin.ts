import { NextRequest } from 'next/server';

const ADMIN_EMAIL = 'marcos.vinicius@movingpay.com.br';

// Check admin from ALL possible session types
export async function getSessionEmail(request: NextRequest): Promise<string | null> {
  // 1. Check manual session cookie (TOTP / Slack login)
  const manualSession = request.cookies.get('session')?.value;
  if (manualSession) {
    try {
      const payload = JSON.parse(Buffer.from(manualSession, 'base64').toString());
      if (payload.email && payload.exp && Date.now() < payload.exp) {
        console.log(`[Admin] ✅ Found manual session: ${payload.email}`);
        return payload.email.trim().toLowerCase();
      }
    } catch {}
  }

  // 2. Check Auth.js session (Google SSO) via auth() helper
  try {
    const { auth } = await import('@/auth');
    const session = await auth();
    if (session?.user?.email) {
      console.log(`[Admin] ✅ Found Auth.js session: ${session.user.email}`);
      return session.user.email.trim().toLowerCase();
    }
  } catch (e: any) {
    console.log(`[Admin] Auth.js check error: ${e?.message || e}`);
  }

  console.log('[Admin] ❌ No valid session found');
  return null;
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  const email = await getSessionEmail(request);
  const result = email === ADMIN_EMAIL;
  console.log(`[Admin] isAdmin: email=${email}, admin=${result}`);
  return result;
}

export { ADMIN_EMAIL };
