import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { texto } = await req.json();

    if (!texto) {
      return NextResponse.json({ error: 'Texto não fornecido.' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave do Gemini não configurada.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `Você é um Analista de Qualidade e Produto (QA/PM). 
Sua tarefa é receber um rascunho de texto (que pode conter gírias, erros gramaticais ou ser informal) e reescrevê-lo de forma técnica, clara e profissional, mantendo a formatação HTML original, caso exista.
Mantenha a intenção do usuário, apenas eleve o vocabulário e estruture melhor as frases.
NÃO crie novos painéis do Jira, apenas melhore o texto corrido.
Retorne APENAS o HTML/texto melhorado, sem blocos de código markdown (\`\`\`html) ao redor.

Texto original:
${texto}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let improvedText = response.text?.trim() || '';
    
    // Remove markdown code fences if Gemini ignores instruction
    improvedText = improvedText.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return NextResponse.json({ success: true, text: improvedText });
  } catch (error: any) {
    console.error('[Gemini Aprimorar Texto] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao aprimorar o texto: ' + error.message },
      { status: 500 }
    );
  }
}
