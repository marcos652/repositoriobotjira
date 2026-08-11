import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/aiFallback';

export async function POST(req: NextRequest) {
  try {
    const { texto } = await req.json();

    if (!texto) {
      return NextResponse.json({ error: 'Texto não fornecido.' }, { status: 400 });
    }

    const prompt = `Você é um Analista de Qualidade e Produto (QA/PM).
Sua tarefa é receber um rascunho de texto (que pode conter gírias, erros gramaticais ou ser informal) e reescrevê-lo de forma técnica, clara e profissional, mantendo a formatação HTML original, caso exista.
Mantenha a intenção do usuário, apenas eleve o vocabulário e estruture melhor as frases.
NÃO crie novos painéis do Jira, apenas melhore o texto corrido.
Retorne APENAS o HTML/texto melhorado, sem blocos de código markdown (\`\`\`html) ao redor.

Texto original:
${texto}`;

    // Gemini primeiro (grátis até a cota diária), Claude como fallback se ele falhar.
    const { text: generated, provider } = await generateText(prompt, { maxTokens: 4096 });
    console.log(`[IA] Texto aprimorado via ${provider}`);

    // Remove markdown code fences if the model ignora a instrução
    const improvedText = generated.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return NextResponse.json({ success: true, text: improvedText });
  } catch (error: any) {
    console.error('[Aprimorar Texto] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao aprimorar o texto. Tente novamente.' },
      { status: 500 }
    );
  }
}
