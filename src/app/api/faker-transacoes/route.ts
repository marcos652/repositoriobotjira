import { NextRequest } from 'next/server';
import {
  createDocumentPicker,
  enviarPayload,
  gerarPayload,
  sleep,
  type AuthHeaderName,
  type FakerTransactionConfig,
} from '@/lib/fakerTransactions';

export const runtime = 'nodejs';

const MAX_NUM_REGISTROS = 100;
const ALLOWED_AUTH_HEADERS: AuthHeaderName[] = ['Authorization', 'x-mvpay-token'];

function splitList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

// Se o formulário não mandar o campo, cai no default fixo em .env.local (FAKER_*) —
// assim os parâmetros usados no dia a dia não precisam ser redigitados a cada teste.
function strOrEnv(bodyValue: unknown, envVar: string): string {
  if (typeof bodyValue === 'string' && bodyValue.trim()) return bodyValue.trim();
  return (process.env[envVar] ?? '').trim();
}

function listOrEnv(bodyValue: unknown, envVar: string): string[] {
  const fromBody = splitList(bodyValue);
  if (fromBody.length) return fromBody;
  return splitList(process.env[envVar]);
}

function parseConfig(body: Record<string, unknown>): { config: FakerTransactionConfig } | { error: string } {
  const gatewayEndpoint = strOrEnv(body?.gatewayEndpoint, 'FAKER_GATEWAY_ENDPOINT');
  const token = strOrEnv(body?.token, 'FAKER_TOKEN');
  const dryRun = Boolean(body?.dryRun);

  if (!dryRun && !gatewayEndpoint) {
    return { error: 'Informe o endpoint do gateway (ou ative o modo simulação).' };
  }
  if (!dryRun && gatewayEndpoint) {
    try {
      new URL(gatewayEndpoint);
    } catch {
      return { error: 'Endpoint do gateway inválido.' };
    }
  }
  if (!dryRun && !token) {
    return { error: 'Informe o token de acesso (ou ative o modo simulação).' };
  }

  const numRegistrosRaw = Number(body?.numRegistros);
  const numRegistros = Math.min(MAX_NUM_REGISTROS, Math.max(1, Number.isFinite(numRegistrosRaw) ? Math.floor(numRegistrosRaw) : 10));

  const delayMsRaw = Number(body?.delayMs);
  const delayMs = Math.min(5000, Math.max(0, Number.isFinite(delayMsRaw) ? Math.floor(delayMsRaw) : 500));

  const documentsList = listOrEnv(body?.documentsList, 'FAKER_DOCUMENTS_LIST');
  const acquirerList = listOrEnv(body?.acquirerList, 'FAKER_ACQUIRER_LIST');
  const brandsList = listOrEnv(body?.brandsList, 'FAKER_BRANDS_LIST');
  const customersIdList = listOrEnv(body?.customersIdList, 'FAKER_CUSTOMERS_ID_LIST');

  if (!dryRun && acquirerList.length === 0) {
    return { error: 'Informe ao menos um adquirente.' };
  }
  if (!dryRun && brandsList.length === 0) {
    return { error: 'Informe ao menos uma bandeira.' };
  }
  // O gateway valida internamente que o customers_id do payload corresponde à conta
  // dono do token — indo null aqui gera "Autenticação interna inválida" em TODAS as chamadas.
  if (!dryRun && customersIdList.length === 0) {
    return { error: 'Informe ao menos um Customers ID (obrigatório para envio real ao gateway).' };
  }

  const authHeaderFromBody = body?.authHeaderName;
  const authHeaderFromEnv = process.env.FAKER_AUTH_HEADER_NAME;
  const authHeaderName: AuthHeaderName = ALLOWED_AUTH_HEADERS.includes(authHeaderFromBody as AuthHeaderName)
    ? (authHeaderFromBody as AuthHeaderName)
    : ALLOWED_AUTH_HEADERS.includes(authHeaderFromEnv as AuthHeaderName)
      ? (authHeaderFromEnv as AuthHeaderName)
      : 'Authorization';

  const config: FakerTransactionConfig = {
    gatewayEndpoint,
    token,
    authHeaderName,
    useBearer: Boolean(body?.useBearer),
    numRegistros,
    delayMs,
    capturePartner: strOrEnv(body?.capturePartner, 'FAKER_CAPTURE_PARTNER') || 'TESTE-PERSONAL',
    documentsList: documentsList.length ? documentsList : ['00000000000000'],
    acquirerList: acquirerList.length ? acquirerList : ['18', '19', '20', '21', '22'],
    brandsList: brandsList.length ? brandsList : ['VISA', 'MASTERCARD', 'ELO'],
    webhookUrl: strOrEnv(body?.webhookUrl, 'FAKER_WEBHOOK_URL'),
    customersIdList,
    dryRun,
  };

  return { config };
}

// Defaults não-sensíveis para pré-preencher o formulário — nunca inclui o token em si,
// só um flag indicando se existe um default configurado no servidor.
export async function GET() {
  return Response.json({
    gatewayEndpoint: process.env.FAKER_GATEWAY_ENDPOINT ?? '',
    hasToken: Boolean(process.env.FAKER_TOKEN),
    authHeaderName: ALLOWED_AUTH_HEADERS.includes(process.env.FAKER_AUTH_HEADER_NAME as AuthHeaderName)
      ? process.env.FAKER_AUTH_HEADER_NAME
      : 'Authorization',
    customersIdList: (process.env.FAKER_CUSTOMERS_ID_LIST ?? ''),
    acquirerList: (process.env.FAKER_ACQUIRER_LIST ?? ''),
    brandsList: (process.env.FAKER_BRANDS_LIST ?? ''),
    documentsList: (process.env.FAKER_DOCUMENTS_LIST ?? ''),
    webhookUrl: (process.env.FAKER_WEBHOOK_URL ?? ''),
    capturePartner: (process.env.FAKER_CAPTURE_PARTNER ?? ''),
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'JSON inválido.' }), { status: 400 });
  }

  const parsed = parseConfig(body);
  if ('error' in parsed) {
    return new Response(JSON.stringify({ success: false, error: parsed.error }), { status: 400 });
  }
  const { config } = parsed;

  const encoder = new TextEncoder();
  const pickDocument = createDocumentPicker(config.documentsList);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      send({ type: 'start', total: config.numRegistros, dryRun: config.dryRun });

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < config.numRegistros; i++) {
        const payload = gerarPayload(config, pickDocument);

        let outcome: { success: boolean; status: number | null; error: string | null };
        if (config.dryRun) {
          outcome = { success: true, status: null, error: null };
        } else {
          outcome = await enviarPayload(config, payload);
        }

        if (outcome.success) successCount++; else failedCount++;

        send({
          type: 'result',
          index: i + 1,
          total: config.numRegistros,
          success: outcome.success,
          status: outcome.status,
          error: outcome.error,
          uuid: payload.uuid,
          customersId: payload.customers_id,
          documento: payload.cpf_cnpj,
          valor: payload.valor,
          parcelas: payload.parcelas,
          bandeira: payload.bandeira,
          adquirente: payload.acquirer_id,
          formaPagamento: payload.forma_pagamento,
        });

        if (i < config.numRegistros - 1 && config.delayMs > 0) {
          await sleep(config.delayMs);
        }
      }

      send({ type: 'done', summary: { total: config.numRegistros, success: successCount, failed: failedCount } });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
