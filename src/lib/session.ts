import crypto from 'crypto';

// Assina/valida o cookie de sessão da aplicação (HMAC-SHA256) para que não possa
// ser forjado pelo cliente — antes era só base64(JSON), qualquer um podia montar
// um cookie válido pra qualquer email sem nenhuma credencial.
const SECRET = process.env.SESSION_SECRET || '';

export type SessionPayload = {
  email: string;
  role?: string;
  iat: number;
  exp: number;
};

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !SECRET) return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expected = sign(data);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (!payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
