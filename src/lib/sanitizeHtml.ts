import DOMPurify from 'isomorphic-dompurify';

// Sanitiza HTML antes de qualquer dangerouslySetInnerHTML — texto vindo do
// Jira, da IA ou do Slack pode conter tags/atributos maliciosos (ex: prompt
// injection fazendo a IA "preservar" um <img onerror=...>). isomorphic-dompurify
// funciona tanto no SSR (via jsdom) quanto no client, então o HTML já sai
// limpo mesmo no primeiro render enviado pelo servidor.
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}
