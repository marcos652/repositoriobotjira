import crypto from 'crypto';

// Assina/valida o cookie de sessão da aplicação (HMAC-SHA256) para que não possa
// ser forjado pelo cliente — antes era só base64(JSON), qualquer um podia montar
// um cookie válido pra qualquer email sem nenhuma credencial.
const SECRET = process.env.SESSION_SECRET || '';

// Duração da sessão: 5h contadas do login. Passado esse prazo o 2º fator (TOTP)
// é pedido de novo. É ABSOLUTO, não deslizante — ver o PUT de /api/custom-session,
// que reemite o cookie sem nunca passar de iat + SESSION_TTL_MS.
// Fonte única: antes esse número estava duplicado em três lugares (os dois ramos
// que criam sessão em /api/auth/totp e o refresh), o que fazia qualquer mudança
// de prazo valer só em parte do fluxo.
export const SESSION_TTL_MS = 5 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

// ── Dispositivo confiável (pular o TOTP por 5h) ──
// Marca separada da sessão, com o único propósito de sobreviver ao logout: o
// cookie de sessão é apagado ao sair (é o que "sair" significa), então ele não
// serve pra lembrar que o 2º fator já foi feito neste navegador.
export const TOTP_TRUST_COOKIE = 'totp_trust';
export const TOTP_TRUST_TTL_MS = 5 * 60 * 60 * 1000;
export const TOTP_TRUST_TTL_SECONDS = TOTP_TRUST_TTL_MS / 1000;

// Os dois cookies são assinados com a MESMA chave, então sem um discriminador o
// cookie de confiança poderia ser colado no lugar do de sessão e valeria como
// login completo. O `kind` amarra cada token ao seu uso.
type TokenKind = 'session' | 'totp-trust';

export type SessionPayload = {
  email: string;
  role?: string;
  kind?: TokenKind;
  iat: number;
  exp: number;
};

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(payload: SessionPayload): string {
  // JSON.stringify transforma NaN/Infinity em null, então um exp inválido gerava
  // um cookie que passava na assinatura mas era recusado por verifySessionToken
  // (que exige exp truthy). O sintoma era péssimo de diagnosticar: o login dizia
  // "realizado", o cookie era gravado, e o proxy devolvia pro /login sem erro
  // nenhum. Melhor falhar alto aqui do que emitir uma sessão morta.
  if (!Number.isFinite(payload.exp) || !Number.isFinite(payload.iat)) {
    throw new Error(
      `createSessionToken: iat/exp precisam ser números finitos (iat=${payload.iat}, exp=${payload.exp})`
    );
  }
  const data = Buffer.from(JSON.stringify({ ...payload, kind: 'session' })).toString('base64url');
  return `${data}.${sign(data)}`;
}

// Emitido junto da sessão, quando o 2º fator é aprovado. Guarda só o e-mail e o
// prazo: é uma afirmação sobre ESTE navegador, não uma credencial de acesso.
export function createTrustToken(email: string): string {
  const issuedAt = Date.now();
  const payload: SessionPayload = {
    email,
    kind: 'totp-trust',
    iat: issuedAt,
    exp: issuedAt + TOTP_TRUST_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

function verifyToken(token: string | undefined | null, expectedKind: TokenKind): SessionPayload | null {
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
    // Cookies emitidos antes do campo existir são sessões — daí o default.
    if ((payload.kind ?? 'session') !== expectedKind) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  return verifyToken(token, 'session');
}

export function verifyTrustToken(token: string | undefined | null): SessionPayload | null {
  return verifyToken(token, 'totp-trust');
}
