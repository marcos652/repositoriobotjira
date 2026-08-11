import dns from 'dns';

// Bloqueia SSRF: só deixa passar URL http(s) cujo host resolva pra um IP público.
// Sem isso, qualquer campo que aceite uma URL "pra buscar depois" (ex: anexo de
// imagem por link) deixa o servidor fazer requisições pra rede interna/metadata
// de nuvem a mando de quem preencheu o campo.
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') || lower.startsWith('fd') || // unique local
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:169.254.')
  );
}

export async function isSafeExternalUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (!parsed.hostname) return false;

  try {
    const results = await dns.promises.lookup(parsed.hostname, { all: true });
    if (results.length === 0) return false;
    for (const { address, family } of results) {
      if (family === 4 && isPrivateIPv4(address)) return false;
      if (family === 6 && isPrivateIPv6(address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
