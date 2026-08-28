import { randomUUID } from 'crypto';

export type AuthHeaderName = 'Authorization' | 'x-mvpay-token';

export interface FakerTransactionConfig {
  gatewayEndpoint: string;
  token: string;
  authHeaderName: AuthHeaderName;
  useBearer: boolean;
  numRegistros: number;
  delayMs: number;
  capturePartner: string;
  documentsList: string[];
  acquirerList: string[];
  brandsList: string[];
  webhookUrl: string;
  customersIdList: string[];
  dryRun: boolean;
}

export interface FakerTransactionPayload {
  customers_id: string | null;
  cpf_cnpj: string;
  merchants_id_mvpay: string | null;
  referencia_externa: string;
  situacao: string;
  refuse_reason: string;
  acquirer_response_code: string;
  acquirer_id: string;
  codigo_autorizacao: string;
  moeda_transacao: string;
  uuid: string;
  cupom_fiscal: string;
  tef_nsu: string;
  nsu: string;
  nsu_cancelamento: string;
  valor: string;
  parcelas: string;
  valor_devolucao: string;
  custo_intercambio: string;
  cartao_portador: string;
  cartao_primeiros_digitos: string;
  cartao_ultimos_digitos: string;
  bandeira: string;
  forma_pagamento: string;
  forma_captura: string;
  codigo_pedido: string;
  numero_serie: string;
  sim_provedor: string;
  sim_numero: string;
  data_inicial_transacao: string;
  data_final_transacao: string;
  data_confirmacao_transacao: string;
  data_pagamento_transacao: string;
  data_cancelamento_transacao: string;
  transacao_internacional: number;
  transacao_ecommerce: number;
  capture_partner: string;
  postback_urls: string[];
}

const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEBIT_BRANDS = ['VISA ELECTRON', 'MAESTRO'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function alphaNumeric(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHANUMERIC_CHARS[randomInt(0, ALPHANUMERIC_CHARS.length - 1)];
  }
  return out;
}

function pickRandom<T>(list: T[]): T {
  return list[randomInt(0, list.length - 1)];
}

/** Sorteia sem repetir até esgotar a lista, depois embaralha e recomeça. */
function createCyclicPicker<T>(list: T[]): () => T {
  let pool: T[] = [];
  return () => {
    if (pool.length === 0) pool = [...list].sort(() => Math.random() - 0.5);
    return pool.pop() as T;
  };
}

function currentDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function gerarPayload(config: FakerTransactionConfig, pickDocument: () => string): FakerTransactionPayload {
  const documentNumber = pickDocument();
  const acquirerId = pickRandom(config.acquirerList);
  const brand = pickRandom(config.brandsList);
  const customersId = config.customersIdList.length ? pickRandom(config.customersIdList) : null;

  const isDebit = DEBIT_BRANDS.includes(brand);

  const installments = isDebit ? 1 : randomInt(1, 12);
  const paymentMethod = isDebit ? 'CHCK' : installments === 1 ? 'CRDT' : 'CRDT_PARC';

  const valorCents = randomInt(10, 1011) * 100;
  const valorString = valorCents.toString();

  const documentStr = String(documentNumber);
  const isCpf = documentStr.length < 11;

  return {
    customers_id: customersId,
    cpf_cnpj: isCpf ? documentStr.padEnd(11, '0') : documentStr.padEnd(14, '0'),
    merchants_id_mvpay: isCpf ? documentNumber : null,
    referencia_externa: '',
    situacao: 'APPR',
    refuse_reason: '',
    acquirer_response_code: '00',
    acquirer_id: acquirerId,
    codigo_autorizacao: alphaNumeric(6),
    moeda_transacao: '096',
    uuid: randomUUID(),
    cupom_fiscal: '',
    tef_nsu: alphaNumeric(12),
    nsu: alphaNumeric(12),
    nsu_cancelamento: '',
    valor: valorString,
    parcelas: installments.toString(),
    valor_devolucao: '0',
    custo_intercambio: '0',
    cartao_portador: 'Indisponível',
    cartao_primeiros_digitos: randomInt(100000, 999999).toString(),
    cartao_ultimos_digitos: randomInt(1000, 9999).toString(),
    bandeira: brand,
    forma_pagamento: paymentMethod,
    forma_captura: 'TEF',
    codigo_pedido: '',
    numero_serie: 'SN-TESTE',
    sim_provedor: '',
    sim_numero: '',
    data_inicial_transacao: currentDateTime(),
    data_final_transacao: currentDateTime(),
    data_confirmacao_transacao: currentDateTime(),
    data_pagamento_transacao: currentDateTime(),
    data_cancelamento_transacao: '',
    transacao_internacional: 0,
    transacao_ecommerce: 0,
    capture_partner: config.capturePartner,
    postback_urls: config.webhookUrl ? config.webhookUrl.split(',').map(s => s.trim()) : [],
  };
}

export function createDocumentPicker(documentsList: string[]): () => string {
  const picker = createCyclicPicker(documentsList.length ? documentsList : ['00000000000000']);
  return picker;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface SendResult {
  success: boolean;
  status: number | null;
  error: string | null;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function enviarPayload(
  config: Pick<FakerTransactionConfig, 'gatewayEndpoint' | 'token' | 'authHeaderName' | 'useBearer'>,
  payload: FakerTransactionPayload,
  retries = 3,
): Promise<SendResult> {
  const authHeader = config.useBearer ? `Bearer ${config.token}` : config.token;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const resp = await fetch(config.gatewayEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [config.authHeaderName]: authHeader,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return { success: true, status: resp.status, error: null };
      }

      const bodyText = await resp.text().catch(() => '');
      const status = resp.status;

      // 4xx (exceto 429) tipicamente não adianta retry
      if (status >= 400 && status < 500 && status !== 429) {
        return { success: false, status, error: bodyText.slice(0, 500) || `HTTP ${status}` };
      }

      if (attempt === retries) {
        return { success: false, status, error: bodyText.slice(0, 500) || `HTTP ${status}` };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === retries) {
        const message = err instanceof Error ? err.message : 'Falha na requisição';
        return { success: false, status: null, error: message };
      }
    }

    const wait = 500 * Math.pow(2, attempt - 1);
    await sleep(wait);
  }

  return { success: false, status: null, error: 'Esgotou as tentativas' };
}
