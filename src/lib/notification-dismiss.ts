// ============================================
//  Notificações dispensadas, por pessoa
// ============================================
//
// A lista de notificações é RECONSTRUÍDA do Jira a cada leitura, então "sair da lista"
// precisa de memória própria: sem isso o item voltaria no refresh seguinte.
//
// Guardado num hash do Redis por pessoa: campo = id da notificação, valor = quando foi
// dispensada. Os ids são estáveis entre reconstruções (issue + id do comentário/histórico +
// destinatário), que é o que faz o "dispensei isto" continuar valendo.
//
// É por PESSOA de propósito: a Fabiana responder uma menção dela não pode fazer a menção do
// Gustavo desaparecer da lista dele.

import crypto from 'crypto';
import { getRedisClient } from './redis';

// 30 dias: a janela de notificações é de 14, então um registro mais velho que isso não tem
// mais nada para esconder. Deixa o hash se limpar sozinho em vez de crescer para sempre.
const TTL_SEGUNDOS = 30 * 24 * 60 * 60;

/**
 * Chave do "dono" das dispensas. Prefere o accountId do Jira (não é dado pessoal e é
 * estável); sem ele, cai num hash do e-mail — nunca o e-mail em texto puro, que ficaria
 * legível para qualquer um com acesso ao Redis.
 */
export function chaveDono(accountId: string | null, email: string | null): string | null {
  if (accountId) return `jiraops:notif-dispensadas:acc:${accountId}`;
  if (email) {
    const h = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
    return `jiraops:notif-dispensadas:eml:${h}`;
  }
  return null;
}

/** Ids já dispensados por essa pessoa. Conjunto vazio quando não há Redis ou dono. */
export async function lerDispensadas(chave: string | null): Promise<Set<string>> {
  const redis = getRedisClient();
  if (!redis || !chave) return new Set();
  try {
    const dados = await redis.hgetall<Record<string, unknown>>(chave);
    return new Set(Object.keys(dados || {}));
  } catch (e) {
    console.error('[Notificações] Falha ao ler dispensadas:', e instanceof Error ? e.message : e);
    return new Set();
  }
}

/** Marca uma notificação como dispensada. Renova o TTL a cada escrita. */
export async function dispensar(chave: string | null, id: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !chave) return false;
  try {
    await redis.hset(chave, { [id]: new Date().toISOString() });
    await redis.expire(chave, TTL_SEGUNDOS);
    return true;
  } catch (e) {
    console.error('[Notificações] Falha ao dispensar:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Traz de volta uma notificação dispensada (desfazer). */
export async function restaurar(chave: string | null, id: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !chave) return false;
  try {
    await redis.hdel(chave, id);
    return true;
  } catch (e) {
    console.error('[Notificações] Falha ao restaurar:', e instanceof Error ? e.message : e);
    return false;
  }
}
