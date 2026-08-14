import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 3 }) : null;

export type AiProvider = 'gemini' | 'claude';

export interface GenerateTextResult {
  text: string;
  provider: AiProvider;
}

// Tenta o Gemini primeiro (grátis até a cota diária) e cai pro Claude
// automaticamente se o Gemini falhar por qualquer motivo (cota esgotada,
// indisponibilidade, chave ausente) — assim nunca fica sem nenhum provedor.
export async function generateText(
  prompt: string,
  opts: {
    maxTokens?: number;
    jsonMode?: boolean;
    forceProvider?: AiProvider;
    // Restringe a saída do Gemini a um schema, de modo que a FORMA passa a ser
    // garantida pela API em vez de confiada ao prompt. Dialeto próprio do Gemini
    // (OpenAPI-ish: tipos em maiúsculas, `nullable`), por isso o nome explícito —
    // o fallback do Claude ainda não é restringido por schema.
    geminiResponseSchema?: object;
  } = {}
): Promise<GenerateTextResult> {
  const maxTokens = opts.maxTokens ?? 4096;

  // forceProvider pula o Gemini de propósito — usado quando ele respondeu, mas
  // com saída inaproveitável (JSON inválido), caso em que repetir nele tende a
  // repetir o mesmo defeito.
  if (gemini && opts.forceProvider !== 'claude') {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        ...(opts.jsonMode
          ? {
              config: {
                responseMimeType: 'application/json',
                ...(opts.geminiResponseSchema ? { responseSchema: opts.geminiResponseSchema } : {}),
              },
            }
          : {}),
      });
      const text = response.text?.trim();
      if (text) return { text, provider: 'gemini' };
      console.warn('[AI Fallback] Gemini retornou resposta vazia, tentando Claude');
    } catch (e: any) {
      console.warn('[AI Fallback] Gemini indisponível, tentando Claude:', e?.message || e);
    }
  }

  if (!anthropic) {
    throw new Error('Nenhum provedor de IA disponível (GEMINI_API_KEY e ANTHROPIC_API_KEY ausentes ou Gemini falhou sem Claude configurado)');
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: maxTokens,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const text = textBlock?.text?.trim() || '';
  if (!text) throw new Error('Claude retornou resposta vazia');
  return { text, provider: 'claude' };
}

// Remove cercas de markdown (```json ... ```) que os modelos acrescentam mesmo
// quando o prompt pede JSON puro.
function stripFences(raw: string): string {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// Desescapar o documento inteiro de uma vez também desfaz os `\n` que estavam
// DENTRO dos valores, virando quebras de linha cruas dentro de strings JSON —
// o que é inválido ("Bad control character in string literal"). Este scanner
// reescapa apenas os caracteres de controle que caíram dentro de string,
// preservando as quebras estruturais (indentação) que ficam fora delas.
const CONTROL_ESCAPES: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

function reescapeControlCharsInStrings(json: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString && ch === '\\') {
      out += ch + (json[i + 1] ?? '');
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    out += inString && CONTROL_ESCAPES[ch] ? CONTROL_ESCAPES[ch] : ch;
  }
  return out;
}

/**
 * Converte a saída de texto de um modelo em objeto, tolerando as três formas
 * que aparecem na prática além do JSON limpo:
 *
 *  1. Envolto em cercas de markdown.
 *  2. ESCAPADO: o modelo devolveu `\n` e `\"` como DOIS caracteres em vez de um.
 *     JSON.parse falha no primeiro caractere ("Unexpected token '\'") porque
 *     uma barra invertida não é início de valor JSON válido.
 *  3. Duplamente codificado: o conteúdo é uma string JSON contendo o JSON real,
 *     então o primeiro parse devolve string em vez de objeto.
 */
export function parseAiJson<T = unknown>(raw: string): T {
  const text = stripFences(raw);
  const candidates = [text];

  // Caso 2: tratar o corpo inteiro como uma string JSON desfaz o escape de uma
  // vez. Só vale tentar quando há sinal de escape, pra não mascarar outros erros.
  if (/^\\[nrt"]|\\"/.test(text)) {
    try {
      const unescaped = JSON.parse(`"${text}"`);
      if (typeof unescaped === 'string') {
        const inner = stripFences(unescaped);
        candidates.push(inner, reescapeControlCharsInStrings(inner));
      }
    } catch {
      // Não era escape válido — segue com os candidatos que já existem.
    }
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      // Caso 3: veio a string do JSON, não o objeto.
      if (typeof parsed === 'string') return JSON.parse(stripFences(parsed)) as T;
      return parsed as T;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
