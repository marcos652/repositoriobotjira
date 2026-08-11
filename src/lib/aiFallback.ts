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
  opts: { maxTokens?: number; jsonMode?: boolean } = {}
): Promise<GenerateTextResult> {
  const maxTokens = opts.maxTokens ?? 4096;

  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        ...(opts.jsonMode ? { config: { responseMimeType: 'application/json' } } : {}),
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
