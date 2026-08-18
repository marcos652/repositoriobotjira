'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Plus, X, Loader2, CheckCircle2, AlertTriangle,
  ImagePlus, User, Hash, Sparkles, Clock,
  Zap, Bot, MessageSquare, ChevronDown, Wand2, ArrowUpRight,
  Layers, Target, PenTool, Upload, Image as ImageIcon, Trash2,
  Mic, MicOff, Eye, EyeOff, Copy, Shield, AlertCircle, Globe,
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code
} from 'lucide-react';
import { Danger, MagicStar, Setting2, ClipboardText, Gps, Cpu, Warning2, TickCircle, DocumentText, NoteText, type Icon as IconsaxIcon } from 'iconsax-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { CLIENTS } from '@/lib/clients';
import VincularIssue, { type IssueVinculada } from '@/components/ui/VincularIssue';
import { buildDescription, getSectionConfig, type IssueLike, type PanelType } from '@/lib/issuePanels';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface CreatedDemandData {
  issue_key?: string;
  issuetype?: string;
  summary?: string;
  url?: string;
  message?: string;
}

interface DemandaResult {
  success: boolean;
  data?: CreatedDemandData;
  error?: string;
}

interface HistoryItem {
  texto: string;
  nomeCliente?: string;
  referencia?: string;
  prioridade?: string;
  urgencia?: string;
  time: string;
  status: 'success' | 'error';
  response?: unknown;
  // Autoria vinda do servidor na resposta da criação. Opcionais porque entradas antigas
  // do localStorage (gravadas antes disso existir) não têm os campos.
  criadoPor?: string;
  ip?: string;
}

// "pedro.cerqueira@movingpay.com.br" -> "Pedro Cerqueira". O e-mail completo continua no
// title do elemento, que é o que serve para auditoria.
function nomeDoEmail(email: string): string {
  if (!email.includes('@')) return email;
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

interface PreviewData extends IssueLike {
  summary: string;
  sections: Record<string, string>;
  description?: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

// Os esqueletos abaixo usam os mesmos rótulos das seções que a IA extrai
// (ver src/lib/issuePanels.ts) — o que a pessoa preenche aqui é o que ela vê
// de volta no preview antes de criar a demanda. O `prompt` é HTML injetado no
// editor, então os rótulos são só texto: o ícone fica no card do template.
const TEMPLATES = [
  {
    Icon: Danger, iconColor: '#FB7185', label: 'Bug Report', shortcut: '1',
    hint: 'Contexto, problema, passos e evidências',
    prompt: `<p><strong>Contexto:</strong> </p><p><strong>Problema:</strong> </p><p><strong>Como replicar:</strong></p><ol><li></li><li></li></ol><p><strong>Evidências:</strong> <em>(cole prints com Ctrl+V ou arraste os arquivos)</em></p>`,
  },
  {
    Icon: MagicStar, iconColor: '#A78BFA', label: 'Nova Feature', shortcut: '2',
    hint: 'Contexto, descrição e critérios de aceite',
    prompt: `<p><strong>Contexto:</strong> </p><p><strong>Descrição:</strong> </p><p><strong>Critérios de aceite:</strong></p><ul><li></li><li></li></ul>`,
  },
  {
    Icon: Setting2, iconColor: '#22D3EE', label: 'Melhoria', shortcut: '3',
    hint: 'Comportamento atual vs. esperado',
    prompt: `<p><strong>Contexto:</strong> </p><p><strong>Comportamento atual:</strong> </p><p><strong>Comportamento esperado:</strong> </p>`,
  },
  {
    Icon: ClipboardText, iconColor: '#60A5FA', label: 'Task', shortcut: '4',
    hint: 'Contexto e descrição da tarefa',
    prompt: `<p><strong>Contexto:</strong> </p><p><strong>Descrição:</strong> </p>`,
  },
];

// Os "value" precisam bater exatamente com os nomes do esquema de prioridade
// configurado no projeto DSMM no Jira (Altíssima/Alta/Médio/Baixa/Baixíssima) —
// não são os nomes padrão do Jira (Highest/High/...), por isso não é livre escolha.
const PRIORITIES = [
  { value: '', label: 'Auto (IA decide)', color: 'var(--text-secondary)' },
  { value: 'Altíssima', label: 'Crítica', color: 'var(--accent-red)' },
  { value: 'Alta', label: 'Alta', color: 'var(--accent-orange)' },
  { value: 'Médio', label: 'Média', color: 'var(--accent-amber)' },
  { value: 'Baixa', label: 'Baixa', color: 'var(--accent-green)' },
  { value: 'Baixíssima', label: 'Mínima', color: 'var(--text-tertiary)' },
];

// Rascunhos/histórico salvos no navegador podem ter um valor antigo (de antes de
// os nomes serem corrigidos pro esquema do Jira) — nunca reaplica um valor que não
// esteja mais na lista atual, senão o Jira rejeita a criação com "prioridade inválida".
const isValidPriority = (v: string) => PRIORITIES.some(p => p.value === v);

// Ícone de cada seção do preview, derivado do tipo de painel devolvido por
// getSectionConfig (que é compartilhado com o servidor e não importa React).
const PANEL_ICONS: Record<PanelType, IconsaxIcon> = {
  info: DocumentText,
  tip: TickCircle,
  warning: Warning2,
  note: NoteText,
};

const URGENCIES = [
  { value: '', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critico', label: 'Crítico — parou produção' },
];

const PROGRESS_STEPS = [
  { label: 'Validando dados...', icon: Shield },
  { label: 'Analisando com IA...', icon: Sparkles },
  { label: 'Criando no Jira...', icon: Zap },
  { label: 'Enviando anexos...', icon: Upload },
  { label: 'Notificando Slack...', icon: MessageSquare },
];

interface UploadedImage {
  url: string;
  filename: string;
  preview?: string;
  isImage?: boolean;
  type?: string;
}

// Load history from localStorage
function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('jiraops-demanda-history');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveHistory(history: HistoryItem[]) {
  try { localStorage.setItem('jiraops-demanda-history', JSON.stringify(history.slice(0, 50))); } catch {}
}

export default function NovaDemandaPage() {
  // Core form state
  const [texto, setTexto] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [referencia, setReferencia] = useState('CONSOLE');
  const [prioridade, setPrioridade] = useState('');
  const [urgencia, setUrgencia] = useState('');
  const [urlsImagens, setUrlsImagens] = useState<string[]>([]);
  const [novaUrl, setNovaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<DemandaResult | null>(null);
  // Começa vazio, IGUAL ao que o servidor renderiza, e só carrega o localStorage depois de
  // montar (no efeito de restauração abaixo). Iniciar o estado com loadHistory() fazia o
  // servidor renderizar "0 criadas" e o cliente "25 criadas" no mesmo <span> — é o
  // hydration mismatch: o React compara os dois e descarta a árvore inteira.
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');
  const [showMeta, setShowMeta] = useState(true);
  const [vinculos, setVinculos] = useState<IssueVinculada[]>([]);
  // Vínculo dispensado explicitamente ("Não necessário"). É uma decisão registrada, não a
  // ausência de decisão: por isso começa false e o envio exige uma das duas coisas.
  const [semVinculo, setSemVinculo] = useState(false);
  const [focusEditor, setFocusEditor] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [currentBodyParams, setCurrentBodyParams] = useState<Record<string, unknown> | null>(null);
  const [validationWarn, setValidationWarn] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    // allowBase64 é OBRIGATÓRIO aqui: o padrão da extensão é false, e nesse modo a
    // regra de parse dela é 'img[src]:not([src^="data:"])' — ou seja, ela DESCARTA
    // silenciosamente toda imagem base64 na entrada. Como o /api/upload-image
    // devolve data URL (para funcionar no serverless da Vercel, sem filesystem),
    // nenhuma imagem colada aparecia dentro do editor. E como não sobrava <img> no
    // getHTML(), a extração no submit também não achava nada para virar marcador:
    // a imagem ia pro Jira só como anexo solto, fora da descrição.
    extensions: [StarterKit, ImageExtension.configure({ inline: true, allowBase64: true })],
    content: texto,
    immediatelyRender: false,
    editorProps: {
      // Intercepta a colagem de imagem aqui — dentro do pipeline do próprio ProseMirror —
      // em vez de um listener global. O handler do ProseMirror roda antes de qualquer
      // listener em "window", então só aqui dá pra evitar que ele insira o clipboard
      // bruto como texto (o "MBNDLÇDMÇ..." ilegível) antes do preventDefault surtir efeito.
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            event.stopPropagation();
            const file = item.getAsFile();
            // Guarda ONDE o cursor está agora: o upload é assíncrono e a imagem
            // precisa entrar aqui, não no fim do texto. É isso que permite
            // escrever, colar a imagem, e continuar escrevendo abaixo.
            if (file) uploadFile(file, view.state.selection.to);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      setTexto(editor.getHTML());
      setValidationWarn('');
    },
    onFocus: () => setFocusEditor(true),
    onBlur: () => setFocusEditor(false),
  });

  // Sync editor content when duplicating from history
  useEffect(() => {
    if (editor && editor.getHTML() !== texto && !editor.isFocused) {
      editor.commands.setContent(texto);
    }
  }, [texto, editor]);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 5000);
    return () => clearTimeout(timer);
  }, [result]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (texto.trim()) {
        // Remove imagens embutidas em base64 antes de salvar — evita estourar a quota do localStorage
        const textoParaDraft = texto.replace(/<img[^>]*src="data:[^"]*"[^>]*>/g, '<p><em>[imagem removida do rascunho — anexe novamente se necessário]</em></p>');
        try { localStorage.setItem('jiraops-demanda-draft', JSON.stringify({ texto: textoParaDraft, nomeCliente, referencia, prioridade, urgencia })); } catch {}
      }
    }, 500);
  }, [texto, nomeCliente, referencia, prioridade, urgencia]);

  // Restore draft on mount
  /* eslint-disable react-hooks/set-state-in-effect -- restores the browser-backed draft on first client render */
  useEffect(() => {
    // Histórico junto do rascunho: os dois vivem no localStorage, que não existe no
    // servidor, então só podem ser lidos depois da hidratação.
    setHistory(loadHistory());
    try {
      const draft = localStorage.getItem('jiraops-demanda-draft');
      if (draft) {
        const d = JSON.parse(draft);
        if (d.texto) { setTexto(d.texto); setNomeCliente(d.nomeCliente || ''); setReferencia(d.referencia || 'CONSOLE'); setPrioridade(isValidPriority(d.prioridade) ? d.prioridade : ''); setUrgencia(d.urgencia || ''); setShowMeta(!!d.nomeCliente || !!d.prioridade || !!d.urgencia); }
      }
    } catch {}
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clearDraft = () => { try { localStorage.removeItem('jiraops-demanda-draft'); } catch {} };

  // Editor Height Adjustment removed as ReactQuill handles its own sizing.

  const addImageUrl = () => {
    if (novaUrl.trim()) { setUrlsImagens([...urlsImagens, novaUrl.trim()]); setNovaUrl(''); }
  };

  const applyTemplate = (prompt: string) => {
    setTexto(prompt);
    editor?.commands.setContent(prompt);
    editor?.commands.focus();
  };

  // Agora que o editor aceita base64, o HTML dele pode ter megabytes de imagem
  // embutida. Enviar isso pra IA custaria caro, estouraria o limite de tokens, e ela
  // devolveria o texto SEM as imagens — que o setContent então apagaria. Então as
  // imagens saem como marcador na ida e voltam no lugar na volta.
  const trocarImagensPorMarcador = (html: string) =>
    html.replace(/<img[^>]*src="data:[^"]*"[^>]*>/g, (tag) => {
      const alt = /alt="([^"]*)"/.exec(tag)?.[1];
      return alt ? ` !${alt}! ` : '';
    });

  const blocoImagem = (url: string, filename: string) =>
    `<p><img src="${url}" alt="${filename}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" /></p>`;

  const restaurarImagens = (html: string) => {
    const comImagens = uploadedImages.reduce((acc, img) => {
      if (!img.isImage) return acc;
      const escapado = img.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return acc.replace(new RegExp(`\\s*!${escapado}!\\s*`, 'g'), blocoImagem(img.url, img.filename));
    }, html);

    // Rede de segurança: a IA às vezes apaga o marcador apesar da instrução, e aí
    // não há onde recolocar a imagem — ela desapareceria do editor E da descrição.
    // O que não voltou é reanexado no fim: melhor no lugar errado do que perdido.
    const perdidas = uploadedImages.filter(
      (img) => img.isImage && !comImagens.includes(`alt="${img.filename}"`)
    );
    if (perdidas.length === 0) return comImagens;

    console.warn(`[Aprimorar] IA removeu ${perdidas.length} marcação(ões) de imagem; reanexando no fim`);
    return comImagens + perdidas.map((img) => blocoImagem(img.url, img.filename)).join('');
  };

  const enhanceText = async () => {
    const htmlContent = editor?.getHTML() || texto;
    if (!htmlContent.trim() || htmlContent === '<p></p>') return;

    setEnhancing(true);
    try {
      const res = await fetch('/api/aprimorar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: trocarImagensPorMarcador(htmlContent) })
      });
      const data = await res.json();
      if (res.ok && data.success && data.text) {
        const comImagens = restaurarImagens(data.text);
        editor?.commands.setContent(comImagens);
        setTexto(comImagens);
      } else {
        setResult({ success: false, error: data.error || 'Erro ao aprimorar texto' });
      }
      } catch {
      setResult({ success: false, error: 'Falha na conexão com a API de aprimoramento' });
    } finally {
      setEnhancing(false);
    }
  };

  // Upload file helper
  const ALLOWED_TYPES = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats', 'text/plain', 'text/csv'];
  // Reduz a imagem ANTES do upload. Print de monitor 4K vira ~2 MB de PNG, que em
  // base64 passa de 2,7 MB — duas dessas já estouram o limite de 4,5 MB por
  // requisição da Vercel (o 413 / FUNCTION_PAYLOAD_TOO_LARGE). WebP em vez de JPEG
  // porque screenshot é cheio de texto e borda dura, onde o JPEG cria halo.
  // Falha em qualquer etapa devolve o arquivo original: melhor grande que perdido.
  const LADO_MAX = 1600;
  const BYTES_LIMITE = 400 * 1024;

  const comprimirImagem = (file: File): Promise<File> =>
    new Promise((resolve) => {
      // SVG é vetor (redimensionar não reduz) e GIF pode ser animado (canvas
      // achataria no primeiro frame).
      if (!file.type.startsWith('image/') || /svg|gif/.test(file.type)) return resolve(file);

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maiorLado = Math.max(img.width, img.height);
        if (maiorLado <= LADO_MAX && file.size <= BYTES_LIMITE) return resolve(file);

        const escala = Math.min(1, LADO_MAX / maiorLado);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            // Se o "comprimido" ficou maior (acontece com print pequeno e chapado),
            // fica o original.
            if (!blob || blob.size >= file.size) return resolve(file);
            const nome = `${file.name.replace(/\.[^.]+$/, '')}.webp`;
            resolve(new File([blob], nome, { type: 'image/webp' }));
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });

  // `insertAt` é a posição no documento onde a imagem deve entrar — capturada no
  // momento da colagem, ANTES do upload. Sem ela a imagem ia sempre pro fim, o que
  // impedia escrever, colar, escrever de novo (o formato do Jira). A posição é
  // capturada e não lida depois porque o upload é assíncrono: o cursor pode ter se
  // movido enquanto o arquivo subia.
  const uploadFile = async (file: File, insertAt?: number) => {
    const isAllowed = ALLOWED_TYPES.some(t => file.type.startsWith(t));
    if (!isAllowed) {
      setResult({ success: false, error: `Tipo de arquivo não suportado: ${file.type}` });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setResult({ success: false, error: 'Arquivo muito grande (máx 15MB)' });
      return;
    }
    setUploading(true);
    try {
      const arquivo = await comprimirImagem(file);
      const formData = new FormData();
      formData.append('file', arquivo);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const isImage = arquivo.type.startsWith('image/');
        const preview = isImage ? URL.createObjectURL(arquivo) : undefined;
        const finalFilename = data.displayName || arquivo.name;
        const img: UploadedImage = { url: data.url, filename: finalFilename, preview, isImage, type: arquivo.type };
        setUploadedImages(prev => [...prev, img]);
        // NÃO empilha o data URL em urlsImagens: ele já vai em "arquivos" no submit,
        // e mandar nos dois lugares dobrava o tamanho da requisição.

        // Bloco próprio (<p>) para a imagem virar uma linha entre parágrafos, e não
        // entrar no meio da frase — é o que dá o "texto, imagem, texto" do Jira.
        // Mesmo helper usado na restauração pós-aprimoramento: se a marcação do
        // <img> divergir entre os dois lugares, a restauração deixa de reconhecer
        // a imagem (ela casa por alt="...").
        const insertion = isImage
          ? blocoImagem(data.url, finalFilename)
          : `<p><a href="${data.url}" target="_blank" rel="noopener noreferrer">${finalFilename}</a></p>`;
        if (editor) {
          if (typeof insertAt === 'number') {
            // Clamp: o documento pode ter encurtado enquanto o upload rodava, e uma
            // posição além do fim faz o ProseMirror lançar RangeError.
            const pos = Math.min(insertAt, editor.state.doc.content.size);
            // focus() depois do insert deixa o cursor após a imagem, pronto pra
            // continuar escrevendo abaixo dela.
            editor.chain().insertContentAt(pos, insertion).focus().run();
          } else {
            // Sem posição (colagem fora do editor, dropzone, seleção de arquivo):
            // vai pro fim, que é o comportamento previsível quando não há cursor.
            editor.chain().focus('end').insertContent(insertion).run();
          }
        } else {
          setTexto(prev => prev + insertion);
        }
      } else {
        setResult({ success: false, error: data.error || 'Erro no upload' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setResult({ success: false, error: 'Falha no upload do arquivo' });
    } finally {
      setUploading(false);
    }
  };

  // Fallback: cola fora do editor (ex.: com foco no campo Cliente/Referência).
  // Colagens feitas dentro do editor são tratadas por editorProps.handlePaste acima,
  // que já chama stopPropagation — então não duplica o upload quando o alvo é o editor.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  };

  const removeUploadedImage = (index: number) => {
    const img = uploadedImages[index];
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setUrlsImagens(prev => prev.filter(u => u !== img.url));
    if (img.preview) URL.revokeObjectURL(img.preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;

    // Validation — min 20 chars
    if (texto.trim().length < 20) {
      setValidationWarn('Descreva com pelo menos 20 caracteres para a IA gerar uma demanda de qualidade.');
      textareaRef.current?.focus();
      return;
    }

    // Validation — mandatory meta fields (Prioridade/Urgência têm "Auto"/"Normal" como escolha válida, não são obrigatórios)
    if (!nomeCliente.trim() || !referencia.trim()) {
      setShowMeta(true);
      setValidationWarn('É obrigatório preencher Cliente e Referência.');
      return;
    }

    // Vínculo: ou tem ticket de origem, ou a pessoa declarou que não tem. O que não pode é
    // passar batido — era justamente o ponto de existir a opção "Não necessário".
    if (vinculos.length === 0 && !semVinculo) {
      setValidationWarn('Vincule o ticket que originou a demanda, ou marque "Não necessário" no campo de vínculo.');
      setShowMeta(true); // o campo mora nos detalhes; se estiverem fechados, o aviso não teria onde apontar
      return;
    }

    setValidationWarn('');
    setLoading(true);
    setResult(null);
    setProgressStep(0);

    // ─── PARSE HTML TO EXTRACT BASE64 IMAGES ───
    const parser = new DOMParser();
    const doc = parser.parseFromString(texto, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const extractedArquivos: {url: string, filename: string}[] = [];
    
    imgs.forEach((img, index) => {
      const src = img.src;
      if (src.startsWith('data:')) {
        const ext = src.split(';')[0].split('/')[1] || 'png';
        const filename = img.getAttribute('alt') || `imagem_colada_${Date.now()}_${index}.${ext}`;
        extractedArquivos.push({ url: src, filename });
        // Substituir a imagem pelo marcador de texto formato Jira wiki
        const textNode = doc.createTextNode(` !${filename}! `);
        img.parentNode?.replaceChild(textNode, img);
      }
    });

    const textoLimpo = doc.body.innerHTML;

    const body: Record<string, unknown> = { texto: textoLimpo };
    if (nomeCliente.trim()) body.nome_cliente = nomeCliente.trim();
    if (referencia.trim()) body.referencia = referencia.trim();
    // Só URLs http digitadas à mão entram aqui. Os uploads NÃO: eles já vão em
    // "arquivos" com o mesmo data URL, e a rota só usa urls_imagens como fallback
    // quando "arquivos" está vazio — mandar os dois dobrava o payload à toa e era
    // metade do caminho para o 413 (limite de 4,5 MB por requisição na Vercel).
    const urlsExternas = urlsImagens.filter((u) => !u.startsWith('data:'));
    if (urlsExternas.length > 0) body.urls_imagens = urlsExternas;
    
    // Unir os arquivos das imagens embutidas (do quill) com os uploads da dropzone
    const todosArquivos = [...uploadedImages.map(img => ({ url: img.url, filename: img.filename })), ...extractedArquivos];
    // Evitar duplicatas baseadas na URL
    const map = new Map(todosArquivos.map(i => [i.url, i]));
    
    if (map.size > 0) {
      body.arquivos = Array.from(map.values());
    }
    if (prioridade) body.prioridade = prioridade;
    if (urgencia) body.urgencia = urgencia;
    // Só chave e tipo: o resumo que a tela guarda serve para mostrar a pill, e mandá-lo
    // engordaria o payload sem uso nenhum do outro lado.
    if (vinculos.length > 0) {
      body.vinculos = vinculos.map((v) => ({ key: v.key, tipo: v.tipoVinculo }));
    }

    // A Vercel corta requisição acima de 4,5 MB e devolve 413
    // FUNCTION_PAYLOAD_TOO_LARGE — um erro de plataforma, sem pista do motivo. Se
    // ainda passar do limite depois da compressão, é melhor dizer o que aconteceu e
    // quanto ficou do que deixar a demanda morrer com código de erro cru.
    const LIMITE_REQUISICAO = 4 * 1024 * 1024;
    const tamanhoPayload = new Blob([JSON.stringify(body)]).size;
    if (tamanhoPayload > LIMITE_REQUISICAO) {
      const mb = (tamanhoPayload / 1024 / 1024).toFixed(1);
      setResult({
        success: false,
        error: `As imagens somam ${mb} MB e o limite por requisição é 4,5 MB. Remova uma imagem ou envie as maiores como anexo direto no Jira depois de criar a demanda.`,
      });
      setLoading(false);
      return;
    }

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setProgressStep(prev => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await fetch('/api/criar-demanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, previewOnly: true }),
      });
      const data = await res.json();
      clearInterval(stepInterval);

      if (res.ok && data.success && data.issueData) {
        setPreviewData(data.issueData);
        setCurrentBodyParams(body);
      } else {
        setResult({ success: false, error: data.error || 'Erro ao gerar o preview com IA' });
      }
    } catch {
      clearInterval(stepInterval);
      setResult({ success: false, error: 'Não foi possível conectar ao servidor' });
    } finally {
      setLoading(false);
      setProgressStep(0);
    }
  };

  const confirmCreate = async () => {
    if (!previewData || !currentBodyParams) return;
    setLoading(true);
    setProgressStep(0);

    // Rebuild description from edited sections before sending (mirrors server logic via shared lib)
    const finalPreviewData = { ...previewData, description: buildDescription(previewData) };
    setPreviewData(null);

    // Simulate progress steps for actual creation
    const stepInterval = setInterval(() => {
      setProgressStep(prev => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const bodyFinal = { ...currentBodyParams, issueDataPreGerado: finalPreviewData };
      const res = await fetch('/api/criar-demanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyFinal),
      });
      const data = await res.json();
      clearInterval(stepInterval);

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (res.ok) {
        setResult({ success: true, data });
        const newHistory = [{ texto: texto.trim().slice(0, 120), nomeCliente, referencia, prioridade, urgencia, time: now, status: 'success' as const, response: data, criadoPor: data.criado_por, ip: data.ip }, ...history];
        setHistory(newHistory);
        saveHistory(newHistory);
        setTexto(''); setNomeCliente(''); setUrlsImagens([]); setReferencia('CONSOLE'); setPrioridade(''); setUrgencia(''); setShowMeta(false);
        clearDraft();
        setCurrentBodyParams(null);
      } else {
        setResult({ success: false, error: data.error || data.detail || 'Erro desconhecido' });
        const newHistory = [{ texto: texto.trim().slice(0, 120), time: now, status: 'error' as const }, ...history];
        setHistory(newHistory);
        saveHistory(newHistory);
      }
    } catch {
      clearInterval(stepInterval);
      setResult({ success: false, error: 'Falha na comunicação com o Jira' });
    } finally {
      setLoading(false);
      setProgressStep(0);
    }
  };

  // Voice recognition (Web Speech API)
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) { setResult({ success: false, error: 'Seu navegador não suporta reconhecimento de voz (use Chrome ou Edge)' }); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setTexto(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening]);

  // Duplicate from history
  const duplicateFromHistory = (item: HistoryItem) => {
    setTexto(item.texto);
    if (item.nomeCliente) setNomeCliente(item.nomeCliente);
    if (item.referencia) setReferencia(item.referencia);
    if (item.prioridade && isValidPriority(item.prioridade)) setPrioridade(item.prioridade);
    if (item.urgencia) setUrgencia(item.urgencia);
    setActiveView('editor');
    setShowMeta(!!(item.nomeCliente || item.prioridade || item.urgencia));
    editor?.commands.setContent(item.texto);
    editor?.commands.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4 && !loading) {
          e.preventDefault();
          applyTemplate(TEMPLATES[num - 1].prompt);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading]);

  const charCount = texto.trim().length;

  return (
    <div className="nd-root">
      {/* ───── HERO ───── */}
      <div className="nd-hero">
        <div className="nd-hero-content">
          <div className="nd-hero-left">
            <div className="nd-hero-icon">
              <Wand2 size={24} color="var(--text-inverse)" />
            </div>
            <div>
              <h1 className="nd-hero-title">Criar Nova Demanda</h1>
              <p className="nd-hero-subtitle">
                Descreva em linguagem natural — a IA cria automaticamente no Jira
              </p>
            </div>
          </div>

          <div className="nd-hero-right">
            <div className="nd-stat">
              <MessageSquare size={13} />
              <span className="nd-stat-value">{history.length}</span>
              <span>criada{history.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="nd-bot-status">
              <div className="nd-status-dot" />
              <Bot size={14} />
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───── BODY ───── */}
      <div className="nd-body">
        {/* ── LEFT PANEL ── */}
        <div className="nd-main">
          {/* Tabs */}
          <div className="nd-tabs">
            <button onClick={() => setActiveView('editor')} className={`nd-tab ${activeView === 'editor' ? 'active' : ''}`}>
              <PenTool size={14} /> Editor
            </button>
            <button onClick={() => setActiveView('history')} className={`nd-tab ${activeView === 'history' ? 'active' : ''}`}>
              <Clock size={14} /> Histórico
              {history.length > 0 && <span className="nd-tab-count">{history.length}</span>}
            </button>

            <div className="nd-tabs-spacer" />

            {activeView === 'editor' && (
              <span className="nd-char-count">
                <span className={charCount > 0 ? 'active' : ''}>{charCount}</span> chars
              </span>
            )}
          </div>

          {activeView === 'editor' ? (
            previewData ? (
              <div className="nd-preview-modal animate-fade-in" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="var(--accent-violet)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Revisão da IA ({previewData.issuetype || 'Task'})</h2>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PenTool size={11} /> Clique nos campos para editar
                  </span>
                </div>

                {/* Título */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Título</div>
                  <input
                    type="text"
                    value={previewData.summary}
                    onChange={(e) => setPreviewData({ ...previewData, summary: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      fontWeight: 600,
                      padding: '10px 12px',
                      borderRadius: '6px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Seções editáveis */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                  {getSectionConfig(previewData).map((sec) => (
                    <div key={sec.key} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: sec.color, marginBottom: '8px', fontWeight: 600 }}>
                        {(() => {
                          const SectionIcon = PANEL_ICONS[sec.panelType];
                          return <SectionIcon size={14} variant="Bold" color={sec.color} aria-hidden="true" />;
                        })()}
                        {sec.label}
                      </div>
                      <textarea
                        value={previewData.sections[sec.key] || ''}
                        onChange={(e) => setPreviewData({
                          ...previewData,
                          sections: { ...previewData.sections, [sec.key]: e.target.value }
                        })}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-secondary)',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          outline: 'none',
                          resize: 'vertical',
                          lineHeight: '1.6',
                          boxSizing: 'border-box',
                        }}
                        rows={Math.max(3, String(previewData.sections[sec.key] || '').split('\n').length)}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {loading && <Loader2 size={16} className="animate-spin" color="var(--accent-violet)" />}
                  <button type="button" onClick={() => setPreviewData(null)} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    Voltar e Editar
                  </button>
                  <button type="button" onClick={confirmCreate} disabled={loading} className="nd-submit-btn" style={{ width: 'auto' }}>
                    <Send size={15} /> {loading ? 'Criando no Jira...' : 'Confirmar e Criar Demanda'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="nd-form">
              {/* Templates */}
              {!texto && (
                <div className="nd-templates">
                  <p className="nd-templates-label">
                    <Layers size={13} /> Começar com template <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '10px' }}>Ctrl+1~4</span>
                  </p>
                  <div className="nd-templates-grid">
                    {TEMPLATES.map((t) => (
                      <button key={t.label} type="button" onClick={() => applyTemplate(t.prompt)} className="nd-template-card" title={t.hint}>
                        <span className="nd-template-icon"><t.Icon size={20} variant="Bold" color={t.iconColor} aria-hidden="true" /></span>
                        <span className="nd-template-label">{t.label}</span>
                        <span className="nd-template-hint">{t.hint}</span>
                        <kbd className="nd-template-kbd">⌃{t.shortcut}</kbd>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor */}
              <div className={`nd-editor ${focusEditor ? 'focused' : ''} ${validationWarn ? 'warn' : ''}`}>
                <div className="nd-editor-header">
                  <div className="nd-editor-dots">
                    <span /><span /><span />
                  </div>
                  <span className="nd-editor-title">demanda.md</span>

                  {/* Toolbar */}
                  <div style={{ marginLeft: '16px', display: 'flex', gap: '2px', alignItems: 'center' }}>
                     <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`nd-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} title="Negrito"><Bold size={13} /></button>
                     <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`nd-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} title="Itálico"><Italic size={13} /></button>
                     <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={`nd-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`} title="Tachado"><Strikethrough size={13} /></button>
                     <div style={{ width: '1px', height: '14px', background: 'var(--border-secondary)', margin: '0 4px' }} />
                     <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`nd-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} title="Lista"><List size={13} /></button>
                     <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`nd-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`} title="Lista Numerada"><ListOrdered size={13} /></button>
                     <div style={{ width: '1px', height: '14px', background: 'var(--border-secondary)', margin: '0 4px' }} />
                     <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`nd-toolbar-btn ${editor?.isActive('blockquote') ? 'active' : ''}`} title="Citação"><Quote size={13} /></button>
                     <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={`nd-toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`} title="Código"><Code size={13} /></button>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {texto.trim() && (
                      <span className="nd-draft-badge">
                        <CheckCircle2 size={9} /> rascunho salvo
                      </span>
                    )}
                    <button type="button" onClick={enhanceText} disabled={enhancing || !texto.trim() || texto === '<p></p>'} className="nd-editor-btn" title="Aprimorar texto com IA" style={{ color: 'var(--accent-violet)' }}>
                      {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </button>
                    <button type="button" onClick={() => setShowPreview(!showPreview)} className="nd-editor-btn" title="Preview Markdown">
                      {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button type="button" onClick={toggleVoice} className={`nd-editor-btn ${isListening ? 'recording' : ''}`} title="Voz para texto">
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                  </div>
                </div>

                {showPreview && texto ? (
                  <div className="nd-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(texto) }} />
                ) : (
                  <div className="nd-editor-textarea" style={{ padding: '16px', minHeight: '220px', display: 'flex', flexDirection: 'column' }} onClick={() => editor?.commands.focus()}>
                    <EditorContent editor={editor} className="tiptap-wrapper" style={{ flexGrow: 1 }} />
                  </div>
                )}
              </div>

              {/* Validation warning */}
              {validationWarn && (
                <div className="nd-validation-warn animate-fade-in">
                  <AlertCircle size={14} />
                  <span>{validationWarn}</span>
                </div>
              )}

              {/* Voice recording indicator */}
              {isListening && (
                <div className="nd-voice-indicator animate-fade-in">
                  <div className="nd-voice-dot" />
                  <span>Ouvindo... fale sua demanda</span>
                  <button type="button" onClick={toggleVoice} className="nd-voice-stop">Parar</button>
                </div>
              )}

              {/* ── IMAGE DROP ZONE ── */}
              <div
                className={`nd-dropzone ${dragOver ? 'active' : ''} ${uploadedImages.length > 0 ? 'has-images' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(uploadFile);
                    e.target.value = '';
                  }}
                />

                {uploading ? (
                  <div className="nd-dropzone-loading">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Fazendo upload...</span>
                  </div>
                ) : uploadedImages.length === 0 ? (
                  <div className="nd-dropzone-empty">
                    <div className="nd-dropzone-icon-wrap">
                      <Upload size={20} />
                    </div>
                    <div>
                      <p className="nd-dropzone-title">Arraste arquivos aqui, cole (Ctrl+V) ou clique para selecionar</p>
                      <p className="nd-dropzone-hint">Imagens, PDF, Word, Excel — até 15MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="nd-dropzone-gallery" onClick={(e) => e.stopPropagation()}>
                    <div className="nd-gallery-grid">
                      {uploadedImages.map((img, i) => (
                        <div key={i} className="nd-gallery-item">
                          {img.preview && img.isImage ? (
                            <img src={img.preview} alt={img.filename} className="nd-gallery-thumb" />
                          ) : (
                            <div className="nd-gallery-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-violet-light)', fontSize: '10px', fontWeight: 700, color: 'var(--accent-violet)', textTransform: 'uppercase' }}>
                              {(img.type || '').split('/').pop()?.replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx').replace('vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx').slice(0, 4) || 'FILE'}
                            </div>
                          )}
                          <span className="nd-gallery-name">{img.filename}</span>
                          <button type="button" onClick={() => removeUploadedImage(i)} className="nd-gallery-remove" title="Remover" aria-label={`Remover ${img.filename}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {/* Add more button */}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="nd-gallery-add">
                        <Plus size={18} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                    <p className="nd-gallery-paste-hint">
                      <ImageIcon size={11} /> Cole com Ctrl+V ou arraste mais arquivos
                    </p>
                  </div>
                )}
              </div>

              {/* Meta toggle */}
              <button type="button" onClick={() => setShowMeta(!showMeta)} className="nd-meta-toggle">
                <Plus size={14} className={`nd-meta-toggle-icon ${showMeta ? 'open' : ''}`} />
                <span>{showMeta ? 'Ocultar detalhes' : 'Adicionar cliente, prioridade, urgência'}</span>
                <ChevronDown size={14} className={`nd-meta-chevron ${showMeta ? 'open' : ''}`} />
              </button>

              {/* Meta fields */}
              {showMeta && (
                <div className="nd-meta animate-fade-in">
                  <div className="nd-meta-row">
                    <div className="nd-input-group">
                      <label><User size={11} /> Cliente</label>
                      <input 
                        value={nomeCliente} 
                        onChange={(e) => setNomeCliente(e.target.value)} 
                        placeholder="Pesquisar cliente..." 
                        list="clientes-list" 
                      />
                      <datalist id="clientes-list">
                        {/* Chave pelo nome: "GERAL MOVINGPAY" e "HOLDING" compartilham
                            id "N/A" no Jira, e os nomes é que são únicos aqui. */}
                        {CLIENTS.map(c => <option key={c.name} value={c.name} />)}
                      </datalist>
                    </div>
                    <div className="nd-input-group">
                      <label><Hash size={11} /> Referência</label>
                      <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="CONSOLE" />
                    </div>
                    <div className="nd-input-group">
                      <label><Target size={11} /> Prioridade</label>
                      <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="nd-select">
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="nd-meta-row" style={{ marginTop: '10px' }}>
                    <div className="nd-input-group">
                      <label><AlertTriangle size={11} /> Urgência</label>
                      <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className="nd-select">
                        {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                    <div className="nd-input-group">
                      <label><ImagePlus size={11} /> Imagem URL</label>
                      <div className="nd-img-row">
                        <input value={novaUrl} onChange={(e) => setNovaUrl(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                          placeholder="https://..." />
                        <button type="button" onClick={addImageUrl} disabled={!novaUrl.trim()} className="nd-img-add">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div />
                  </div>
                  {/* Vínculo com issue existente. Fica aqui, junto dos outros detalhes, porque
                      é opcional: a maioria das demandas não vem de um ticket. */}
                  <div style={{ marginTop: '12px' }}>
                    <VincularIssue
                      vinculos={vinculos}
                      onChange={setVinculos}
                      dispensado={semVinculo}
                      onDispensadoChange={setSemVinculo}
                    />
                  </div>

                  {urlsImagens.length > 0 && (
                    <div className="nd-img-pills">
                      {urlsImagens.map((u, i) => (
                        <span key={i} className="nd-img-pill">
                          <ImagePlus size={10} />
                          <span>{u.split('/').pop()?.slice(0, 30)}</span>
                          <button type="button" onClick={() => setUrlsImagens(urlsImagens.filter((_, j) => j !== i))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="nd-action-bar">
                {loading ? (
                  <div className="nd-progress">
                    {PROGRESS_STEPS.map((step, i) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={i} className={`nd-progress-step ${i <= progressStep ? 'active' : ''} ${i === progressStep ? 'current' : ''}`}>
                          <StepIcon size={12} className={i === progressStep ? 'animate-spin' : ''} />
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="nd-tips">
                    {[
                      { Icon: Gps, label: 'Seja específico' },
                      { Icon: ClipboardText, label: 'Critérios de aceite' },
                      { Icon: Cpu, label: 'IA define tipo' },
                    ].map((tip) => (
                      <span key={tip.label} className="nd-tip">
                        <tip.Icon size={12} variant="Bold" aria-hidden="true" /> {tip.label}
                      </span>
                    ))}
                  </div>
                )}
                <button type="submit" disabled={loading || !texto.trim()} className="nd-submit-btn">
                  {loading ? (
                    <><Loader2 size={17} className="animate-spin" /> Processando...</>
                  ) : (
                    <><Sparkles size={16} /> Criar Demanda <kbd className="nd-kbd">Ctrl ↵</kbd></>
                  )}
                </button>
              </div>
            </form>
            )
          ) : (
            /* ── HISTORY VIEW ── */
            <div className="nd-history">
              {history.length === 0 ? (
                <div className="nd-history-empty">
                  <div className="nd-history-empty-icon"><Clock size={32} /></div>
                  <p>Nenhuma demanda enviada ainda</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button type="button" onClick={() => { setHistory([]); saveHistory([]); }} className="nd-clear-history">
                      <Trash2 size={12} /> Limpar histórico
                    </button>
                  </div>
                  <div className="nd-history-list">
                    {history.map((h, i) => (
                      <div key={i} className="nd-history-item">
                        <div className={`nd-history-dot ${h.status}`}>
                          {h.status === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        </div>
                        <div className="nd-history-content">
                          <div className="nd-history-meta">
                            <span className="nd-history-time">{h.time}</span>
                            <span className={`nd-history-badge ${h.status}`}>
                              {h.status === 'success' ? 'Criada' : 'Erro'}
                            </span>
                            {h.prioridade && <span className="nd-history-badge" style={{ background: 'var(--accent-violet-light)', color: 'var(--accent-indigo-soft)' }}>{h.prioridade}</span>}
                            {h.urgencia && <span className="nd-history-badge" style={{ background: 'var(--accent-rose-light)', color: 'var(--accent-rose-soft)' }}>{h.urgencia}</span>}
                          </div>
                          <p className="nd-history-text">{h.texto}</p>
                          {h.response != null && (
                            <pre className="nd-history-json">{JSON.stringify(h.response, null, 2)}</pre>
                          )}
                          <div className="nd-history-actions">
                            <button type="button" onClick={() => duplicateFromHistory(h)} className="nd-history-action" title="Reutilizar esta demanda">
                              <Copy size={12} /> Duplicar
                            </button>
                            {/* Autoria ao lado do Duplicar. Só aparece em entradas gravadas
                                depois desta mudança — as antigas do localStorage não têm os
                                campos, e mostrar "desconhecido" seria pior que omitir. */}
                            {(h.criadoPor || h.ip) && (
                              <span className="nd-history-meta">
                                {h.criadoPor && (
                                  <span className="nd-history-meta-item" title={h.criadoPor}>
                                    <User size={11} aria-hidden="true" />
                                    {nomeDoEmail(h.criadoPor)}
                                  </span>
                                )}
                                {h.ip && (
                                  <span className="nd-history-meta-item" title={`IP de origem: ${h.ip}`}>
                                    <Globe size={11} aria-hidden="true" />
                                    {h.ip}
                                  </span>
                                )}
                                <span className="nd-history-meta-item" title="Horário da criação">
                                  <Clock size={11} aria-hidden="true" />
                                  {h.time}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="nd-sidebar">
          {/* How it works */}
          <div className="nd-sidebar-section">
            <h3 className="nd-sidebar-title">Como funciona</h3>
            <div className="nd-steps">
              {[
                { n: '1', icon: <PenTool size={14} />, title: 'Descreva', desc: 'Escreva em linguagem natural', color: 'var(--accent-indigo)' },
                { n: '2', icon: <Wand2 size={14} />, title: 'IA Processa', desc: 'Gemini analisa e classifica', color: 'var(--accent-violet)' },
                { n: '3', icon: <Zap size={14} />, title: 'Jira', desc: 'Issue criada automaticamente', color: 'var(--accent-violet-soft)' },
              ].map((s, i) => (
                <div key={i} className="nd-step">
                  <div className="nd-step-icon" style={{ background: 'var(--accent-violet-light)', color: s.color }}>{s.icon}</div>
                  <div>
                    <p className="nd-step-title">{s.title}</p>
                    <p className="nd-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="nd-sidebar-divider" />

          {/* Connection */}
          <div className="nd-sidebar-section">
            <h3 className="nd-sidebar-title">Conexão</h3>
            <div className="nd-connection">
              <div className="nd-connection-row">
                <div className="nd-connection-icon">
                  <Bot size={15} color="var(--text-inverse)" />
                </div>
                <div>
                  <p className="nd-connection-name">Jira + IA (Gemini)</p>
                  <p className="nd-connection-url">movingpay.atlassian.net</p>
                </div>
                <div className="nd-connection-status">
                  <div className="nd-pulse-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="nd-sidebar-divider" />

          {/* Activity */}
          <div className="nd-sidebar-section">
            <h3 className="nd-sidebar-title">Atividade</h3>
            {history.length === 0 ? (
              <p className="nd-sidebar-empty">Aguardando...</p>
            ) : (
              <div className="nd-activity">
                {history.slice(0, 6).map((h, i) => (
                  <div key={i} className="nd-activity-item">
                    <div className="nd-activity-dot" style={{ background: h.status === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
                    <span className="nd-activity-text">{h.texto.slice(0, 40)}...</span>
                    <span className="nd-activity-time">{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Result Card ── */}
      {result && result.success && result.data?.issue_key && (
        <div className="animate-fade-in" style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          width: '400px', maxWidth: 'calc(100vw - 48px)',
          borderRadius: '24px', overflow: 'hidden',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-primary)',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--accent-emerald-light)',
                border: '1px solid var(--accent-emerald-light)',
              }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-green-soft)' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green-soft)' }}>Demanda criada!</span>
            </div>
            <button onClick={() => setResult(null)} aria-label="Fechar resultado" style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--text-tertiary)',
            }}><X size={14} /></button>
          </div>

          {/* Issue Key — Big Badge */}
          <div style={{ padding: '16px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em',
              color: 'var(--accent-blue-soft)',
            }}>
              {result.data.issue_key}
            </span>
            {result.data.issuetype && (
              <span style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: result.data.issuetype === 'Bug' ? 'var(--accent-rose-light)' : result.data.issuetype === 'Story' ? 'var(--accent-emerald-light)' : 'var(--accent-blue-light)',
                color: result.data.issuetype === 'Bug' ? 'var(--accent-rose-soft)' : result.data.issuetype === 'Story' ? 'var(--accent-green-soft)' : 'var(--accent-blue-soft)',
                border: `1px solid ${result.data.issuetype === 'Bug' ? 'var(--accent-rose-light)' : result.data.issuetype === 'Story' ? 'var(--accent-emerald-light)' : 'var(--accent-blue-light)'}`,
              }}>
                {result.data.issuetype}
              </span>
            )}
          </div>

          {/* Summary */}
          {result.data.summary && (
            <div style={{ padding: '0 24px 16px' }}>
              <p style={{
                fontSize: '13px', fontWeight: 500, lineHeight: '1.5',
                color: 'var(--text-secondary)', margin: 0,
              }}>
                {result.data.summary}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-secondary)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <a
              href={result.data.url || `https://movingpay.atlassian.net/browse/${result.data.issue_key}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: 'var(--accent-blue)',
                color: 'var(--text-inverse)', textDecoration: 'none',
                border: '1px solid var(--accent-blue)',
              }}
            >
              Abrir no Jira
              <ArrowUpRight size={14} />
            </a>
            <button
              onClick={() => setResult(null)}
              style={{
                padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Success without key / Error Toast ── */}
      {result && (!result.success || (result.success && !result.data?.issue_key)) && (
        <div className={`nd-toast ${result.success ? 'success' : 'error'} animate-fade-in`}>
          {result.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div className="nd-toast-content">
            <p className="nd-toast-title">{result.success ? 'Demanda criada!' : 'Falha ao criar'}</p>
            {result.error && <p className="nd-toast-desc">{result.error}</p>}
            {result.success && result.data?.message && <p className="nd-toast-desc">{result.data.message}</p>}
          </div>
          <button onClick={() => setResult(null)} className="nd-toast-close" aria-label="Fechar aviso"><X size={16} /></button>
        </div>
      )}

      <style jsx>{`
        /* ========== ROOT ========== */
        .nd-root { display: flex; flex-direction: column; min-height: 100%; gap: 24px; }

        /* ========== HERO ========== */
        .nd-hero {
          position: relative; flex-shrink: 0;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
        }

        .nd-hero-content { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        .nd-hero-left { display: flex; align-items: center; gap: 16px; }
        .nd-hero-icon {
          width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
          background: var(--accent-violet);
        }
        .nd-hero-title { font-size: 32px; line-height: 36px; font-weight: 500; color: var(--text-primary); letter-spacing: -0.02em; }
        .nd-hero-subtitle { font-size: 15px; line-height: 24px; color: var(--text-secondary); margin-top: 4px; }
        .nd-hero-right { display: flex; align-items: center; gap: 10px; }
        .nd-stat { display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px; background: var(--bg-card-solid); border: 1px solid var(--border-primary); color: var(--text-tertiary); font-size: 11px; font-weight: 600; }
        .nd-stat-value { color: var(--text-primary); font-weight: 800; font-variant-numeric: tabular-nums; }
        .nd-bot-status { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; background: var(--accent-emerald-light); border: 1px solid var(--accent-emerald-light); color: var(--accent-emerald); font-size: 11px; font-weight: 700; }
        .nd-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-emerald); }

        /* Usado só pelo indicador de gravação de voz ativa (feedback funcional, não decoração ambiente) */
        @keyframes ndP { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ========== BODY ========== */
        .nd-body { flex: 1; display: flex; align-items: flex-start; gap: 24px; }
        .nd-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-primary); border-radius: 24px; background: var(--bg-card-solid); }

        /* ========== TABS ========== */
        .nd-tabs { display: flex; align-items: center; gap: 4px; padding: 16px 24px; border-bottom: 1px solid var(--border-secondary); }
        .nd-tab {
          display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px;
          font-size: 12px; font-weight: 600; color: var(--text-tertiary); background: none;
          border: 1px solid transparent; cursor: pointer;
        }
        .nd-tab:hover { background: var(--bg-secondary); color: var(--text-secondary); }
        .nd-tab.active { background: var(--accent-blue-light); border-color: var(--accent-blue-light); color: var(--accent-blue); }
        .nd-tab-count { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 999px; background: var(--accent-blue); color: var(--text-inverse); }
        .nd-tabs-spacer { flex: 1; }
        .nd-char-count { font-size: 11px; font-family: monospace; color: var(--text-tertiary); }
        .nd-char-count .active { color: var(--accent-blue); font-weight: 700; }

        /* ========== FORM ========== */
        .nd-form { flex: 1; display: flex; flex-direction: column; }
        .nd-preview-modal { margin: 24px; }

        /* Templates */
        .nd-templates { padding: 24px 24px 0; }
        .nd-templates-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
        .nd-templates-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .nd-template-card {
          display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border-radius: 16px;
          background: var(--bg-secondary); border: 1px solid var(--border-primary); cursor: pointer;
        }
        .nd-template-card:hover { border-color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-template-icon { display: flex; align-items: center; justify-content: center; }
        .nd-template-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
        .nd-template-hint { font-size: 9px; line-height: 1.3; color: var(--text-tertiary); text-align: center; }

        /* Editor */
        .nd-editor {
          margin: 24px 24px 0; border-radius: 16px; overflow: hidden;
          background: var(--bg-secondary); border: 1px solid var(--border-primary);
        }
        .nd-editor.focused { border-color: var(--accent-indigo); }
        .nd-editor-header {
          display: flex; align-items: center; gap: 10px; padding: 10px 16px;
          background: var(--bg-card); border-bottom: 1px solid var(--border-secondary);
        }
        .nd-editor-dots { display: none; }
        .nd-editor-title { font-size: 11px; font-weight: 500; color: var(--text-tertiary); font-family: monospace; }
        .nd-editor-textarea {
          width: 100%; min-height: 220px; padding: 20px; background: transparent;
          border: none; outline: none; resize: none; font-size: 14px; line-height: 1.85;
          color: var(--text-primary); font-family: inherit;
        }
        
        /* Tiptap Toolbar & ProseMirror */
        .nd-toolbar-btn {
           display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
           border-radius: 4px; border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; transition: 0.2s;
        }
        .nd-toolbar-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
        .nd-toolbar-btn.active { background: var(--accent-blue-light); color: var(--accent-blue); }

        /* O ProseMirror e o .tiptap-wrapper são renderizados pelo <EditorContent>,
           não por este componente — sem :global() o styled-jsx prefixa os seletores
           com a classe de escopo e nenhuma destas regras chega ao editor (era o que
           deixava a área editável com 1 linha e com o anel de foco branco do browser).
           Prefixado por .nd-editor-textarea pra não vazar em outros editores. */
        :global(.nd-editor-textarea .tiptap-wrapper) { flex-grow: 1; display: flex; flex-direction: column; min-height: 220px; border: none; outline: none; box-shadow: none; }
        :global(.nd-editor-textarea .ProseMirror) { flex-grow: 1; min-height: 220px; border: none; outline: none; box-shadow: none; font-size: 14px; line-height: 1.85; color: var(--text-primary); }
        :global(.nd-editor-textarea .ProseMirror p) { margin-bottom: 0.5em; }
        :global(.nd-editor-textarea .ProseMirror ul) { list-style-type: disc; margin-left: 20px; margin-bottom: 0.5em; }
        :global(.nd-editor-textarea .ProseMirror ol) { list-style-type: decimal; margin-left: 20px; margin-bottom: 0.5em; }
        :global(.nd-editor-textarea .ProseMirror blockquote) { border-left: 3px solid var(--border-secondary); padding-left: 10px; color: var(--text-secondary); margin-bottom: 0.5em; }
        :global(.nd-editor-textarea .ProseMirror pre) { background: var(--bg-input); padding: 10px; border-radius: 6px; font-family: monospace; margin-bottom: 0.5em; }
        :global(.nd-editor-textarea .ProseMirror img) { max-width: 100%; height: auto; border-radius: 8px; }

        /* Meta toggle */
        .nd-meta-toggle {
          display: flex; align-items: center; gap: 6px; margin: 16px 24px 0; padding: 0;
          font-size: 12px; font-weight: 600; color: var(--accent-blue); background: none; border: none; cursor: pointer;
        }
        .nd-meta-toggle-icon { transition: transform 0.2s; }
        .nd-meta-toggle-icon.open { transform: rotate(45deg); }
        .nd-meta-chevron { transition: transform 0.2s; }
        .nd-meta-chevron.open { transform: rotate(180deg); }

        /* Meta fields */
        .nd-meta { padding: 16px 24px 0; }
        .nd-meta-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .nd-input-group label {
          display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 6px;
        }
        .nd-input-group input {
          width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 12px;
          background: var(--bg-secondary); border: 1px solid var(--border-primary);
          color: var(--text-primary); outline: none; transition: border-color 0.15s;
        }
        .nd-input-group input:focus { border-color: var(--accent-blue); }
        .nd-img-row { display: flex; gap: 6px; }
        .nd-img-row input { flex: 1; }
        .nd-img-add {
          width: 32px; flex-shrink: 0; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          background: var(--accent-blue-light); color: var(--accent-blue); border: none; cursor: pointer;
        }
        .nd-img-add:disabled { opacity: 0.3; cursor: not-allowed; }
        .nd-img-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .nd-img-pill {
          display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
          background: var(--accent-blue-light); color: var(--accent-blue); font-size: 10px; font-weight: 600;
        }
        .nd-img-pill button { background: none; border: none; cursor: pointer; color: var(--accent-rose); display: flex; }

        /* ========== ACTION BAR ========== */
        .nd-action-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; margin-top: 24px; flex-shrink: 0;
          border-top: 1px solid var(--border-primary); background: var(--bg-card-solid);
        }
        .nd-tips { display: flex; flex-wrap: wrap; gap: 8px 16px; }
        .nd-tip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-tertiary); }
        .nd-submit-btn {
          display: flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 8px;
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          background: var(--accent-indigo); color: var(--text-inverse);
        }
        .nd-submit-btn:hover { background: var(--accent-violet); }
        .nd-submit-btn:disabled { background: var(--bg-card-hover); color: var(--text-tertiary); cursor: not-allowed; }
        .nd-kbd { font-size: 9px; padding: 2px 6px; border-radius: 4px; background: var(--bg-primary); font-family: monospace; margin-left: 2px; }

        /* ========== DROPZONE ========== */
        .nd-dropzone {
          margin: 16px 24px 0; border-radius: 16px; cursor: pointer;
          border: 2px dashed var(--border-primary); padding: 16px;
          background: var(--bg-secondary);
        }
        .nd-dropzone:hover { border-color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-dropzone.active { border-color: var(--accent-blue); background: var(--accent-blue-light); border-style: solid; }
        .nd-dropzone.has-images { border-style: solid; cursor: default; padding: 12px; }
        .nd-dropzone-empty { display: flex; align-items: center; gap: 14px; }
        .nd-dropzone-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: var(--accent-blue-light); color: var(--accent-blue); flex-shrink: 0;
        }
        .nd-dropzone-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
        .nd-dropzone-hint { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }
        .nd-dropzone-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 0; color: var(--accent-blue); font-size: 12px; font-weight: 600; }
        .nd-dropzone-gallery { }
        .nd-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
        .nd-gallery-item {
          position: relative; border-radius: 10px; overflow: hidden; background: var(--bg-card-solid);
          border: 1px solid var(--border-secondary); display: flex; flex-direction: column;
        }
        .nd-gallery-item:hover { border-color: var(--accent-blue); }
        .nd-gallery-thumb { width: 100%; height: 80px; object-fit: cover; display: block; }
        .nd-gallery-name { font-size: 9px; font-weight: 600; color: var(--text-tertiary); padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nd-gallery-remove {
          position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;
          background: var(--bg-overlay); color: var(--text-primary); opacity: 0; transition: opacity 0.15s;
        }
        .nd-gallery-item:hover .nd-gallery-remove { opacity: 1; }
        .nd-gallery-add {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          border-radius: 10px; border: 2px dashed var(--border-primary); background: transparent;
          color: var(--text-tertiary); cursor: pointer; min-height: 106px;
          font-size: 10px; font-weight: 600;
        }
        .nd-gallery-add:hover { border-color: var(--accent-blue); color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-gallery-paste-hint {
          display: flex; align-items: center; gap: 4px; margin-top: 8px;
          font-size: 10px; color: var(--text-tertiary);
        }
        .hidden { display: none; }

        /* ========== HISTORY ========== */
        .nd-history { flex: 1; padding: 24px; }
        .nd-history-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; }
        .nd-history-empty-icon { width: 64px; height: 64px; border-radius: 20px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: var(--text-tertiary); }
        .nd-history-empty p { color: var(--text-tertiary); font-size: 13px; }
        .nd-history-list { display: flex; flex-direction: column; gap: 10px; }
        .nd-history-item { display: flex; gap: 12px; padding: 16px; border-radius: 16px; background: var(--bg-secondary); border: 1px solid var(--border-primary); }
        .nd-history-dot { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-history-dot.success { background: var(--accent-emerald-light); color: var(--accent-emerald); }
        .nd-history-dot.error { background: var(--accent-rose-light); color: var(--accent-rose); }
        .nd-history-content { flex: 1; min-width: 0; }
        .nd-history-meta { display: flex; gap: 6px; margin-bottom: 6px; }
        .nd-history-time { font-size: 10px; font-family: monospace; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: var(--bg-card); color: var(--text-tertiary); }
        .nd-history-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
        .nd-history-badge.success { background: var(--accent-emerald-light); color: var(--accent-emerald); }
        .nd-history-badge.error { background: var(--accent-rose-light); color: var(--accent-rose); }
        .nd-history-text { font-size: 13px; color: var(--text-primary); line-height: 1.5; }
        .nd-history-json { font-size: 10px; margin-top: 8px; padding: 10px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-secondary); color: var(--text-secondary); overflow-x: auto; font-family: monospace; }

        /* ========== SIDEBAR ========== */
        .nd-sidebar { width: 280px; flex-shrink: 0; border: 1px solid var(--border-primary); border-radius: 24px; background: var(--bg-card-solid); overflow: hidden; }
        .nd-sidebar-section { padding: 24px; }
        .nd-sidebar-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-tertiary); margin-bottom: 14px; }
        .nd-sidebar-divider { height: 1px; margin: 0 24px; background: var(--border-secondary); }
        .nd-sidebar-empty { font-size: 11px; color: var(--text-tertiary); font-style: italic; }

        /* Steps */
        .nd-steps { display: flex; flex-direction: column; gap: 14px; }
        .nd-step { display: flex; gap: 10px; align-items: flex-start; }
        .nd-step-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-step-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
        .nd-step-desc { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }

        /* Connection */
        .nd-connection { padding: 12px; border-radius: 16px; background: var(--bg-secondary); border: 1px solid var(--border-primary); }
        .nd-connection-row { display: flex; align-items: center; gap: 10px; }
        .nd-connection-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--accent-indigo); flex-shrink: 0; }
        .nd-connection-name { font-size: 11px; font-weight: 700; color: var(--text-primary); }
        .nd-connection-url { font-size: 9px; font-family: monospace; color: var(--text-tertiary); }
        .nd-connection-status { margin-left: auto; }
        .nd-pulse-sm { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); }

        /* Activity */
        .nd-activity { display: flex; flex-direction: column; gap: 8px; }
        .nd-activity-item { display: flex; align-items: center; gap: 8px; }
        .nd-activity-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .nd-activity-text { flex: 1; font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nd-activity-time { font-size: 9px; font-family: monospace; color: var(--text-tertiary); flex-shrink: 0; }

        /* ========== TOAST ========== */
        .nd-toast {
          position: fixed; right: 24px; bottom: 24px; z-index: 200;
          display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: 24px;
          min-width: 420px; max-width: 640px;
          animation: ndUp 0.2s ease-out;
        }
        .nd-toast.success { background: var(--bg-card-solid); color: var(--accent-green-soft); border: 1px solid var(--accent-emerald); }
        .nd-toast.error { background: var(--bg-card-solid); color: var(--accent-rose-soft); border: 1px solid var(--accent-rose); }
        .nd-toast-content { flex: 1; min-width: 0; }
        .nd-toast-title { font-size: 13px; font-weight: 700; }
        .nd-toast-desc { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        .nd-toast-json { font-size: 10px; margin-top: 8px; padding: 8px; border-radius: 6px; background: var(--bg-primary); overflow-x: auto; font-family: monospace; max-height: 120px; }
        .nd-toast-close { background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; }
        .nd-toast-close:hover { opacity: 1; }
        @keyframes ndUp { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 900px) {
          .nd-sidebar { display: none; }
          .nd-body { display: block; }
          .nd-templates-grid { grid-template-columns: repeat(2, 1fr); }
          .nd-meta-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .nd-hero-content { flex-direction: column; gap: 12px; }
          .nd-hero-right { width: 100%; flex-wrap: wrap; }
          .nd-main { border-radius: 20px; }
          .nd-tabs { padding: 14px 16px; }
          .nd-templates { padding: 16px 16px 0; }
          .nd-template-card { align-items: flex-start; }
          .nd-editor { margin: 16px 16px 0; }
          .nd-editor-header { flex-wrap: wrap; }
          .nd-preview-modal { margin: 16px; padding: 16px !important; }
          .nd-dropzone, .nd-meta-toggle { margin-right: 16px; margin-left: 16px; }
          .nd-meta { padding-right: 16px; padding-left: 16px; }
          .nd-validation-warn, .nd-voice-indicator { margin-right: 16px; margin-left: 16px; }
          .nd-action-bar { align-items: stretch; flex-direction: column; gap: 12px; padding: 16px; }
          .nd-tips { display: none; }
          .nd-submit-btn { justify-content: center; width: 100%; }
          .nd-history { padding: 16px; }
          .nd-toast { right: 16px; left: 16px; min-width: 0; max-width: none; }
        }

        /* ========== NEW FEATURES STYLES ========== */

        /* Editor buttons */
        .nd-editor-btn {
          width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-secondary);
          background: var(--bg-secondary); color: var(--text-tertiary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .nd-editor-btn:hover { border-color: var(--accent-blue); color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-editor-btn.recording { border-color: var(--accent-red); color: var(--accent-red); background: var(--accent-rose-light); animation: ndP 1s ease-in-out infinite; }

        /* Draft saved badge */
        .nd-draft-badge {
          display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
          font-size: 9px; font-weight: 600; color: var(--accent-emerald); background: var(--accent-emerald-light);
          border: 1px solid var(--accent-emerald-light);
        }

        /* Template kbd hint */
        .nd-template-kbd {
          font-size: 9px; font-family: monospace; padding: 1px 5px; border-radius: 3px;
          background: var(--bg-primary); color: var(--text-tertiary); margin-top: 2px;
        }

        /* Markdown Preview */
        .nd-preview {
          padding: 20px; min-height: 220px; font-size: 14px; line-height: 1.85;
          color: var(--text-primary);
        }
        .nd-preview strong { color: var(--accent-blue); }
        .nd-preview em { color: var(--accent-violet); font-style: italic; }

        /* Validation warning */
        .nd-editor.warn { border-color: var(--accent-amber); }
        .nd-validation-warn {
          display: flex; align-items: center; gap: 8px; margin: 8px 24px 0;
          padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
          background: var(--accent-amber-light); color: var(--accent-amber);
          border: 1px solid var(--accent-amber-light);
        }

        /* Voice indicator */
        .nd-voice-indicator {
          display: flex; align-items: center; gap: 10px; margin: 8px 24px 0;
          padding: 12px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
          background: var(--accent-rose-light); color: var(--accent-rose-soft);
          border: 1px solid var(--accent-rose-light);
        }
        .nd-voice-dot {
          width: 10px; height: 10px; border-radius: 50%; background: var(--accent-red);
          animation: ndP 1s ease-in-out infinite;
        }
        .nd-voice-stop {
          margin-left: auto; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;
          background: var(--accent-rose-light); color: var(--accent-rose-soft); border: 1px solid var(--accent-rose-light);
          cursor: pointer;
        }
        .nd-voice-stop:hover { border-color: var(--accent-rose); }

        /* Select dropdown */
        .nd-select {
          width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 12px;
          background: var(--bg-secondary); border: 1px solid var(--border-primary);
          color: var(--text-primary); outline: none; transition: border-color 0.15s;
          cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
        }
        .nd-select:focus { border-color: var(--accent-blue); }
        .nd-select option { background: var(--bg-card); color: var(--text-primary); }

        /* Progress steps */
        .nd-progress { display: flex; gap: 6px; flex-wrap: wrap; }
        .nd-progress-step {
          display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
          font-size: 10px; font-weight: 600; color: var(--text-tertiary);
          background: var(--bg-secondary); border: 1px solid var(--border-secondary);
        }
        .nd-progress-step.active { color: var(--accent-emerald); background: var(--accent-emerald-light); border-color: var(--accent-emerald-light); }
        .nd-progress-step.current { color: var(--accent-blue); background: var(--accent-blue-light); border-color: var(--accent-blue-light); }

        /* History actions */
        /* align-items:center alinha a autoria com o botão; flex-wrap evita que IP e horário
           vazem da caixa em tela estreita. */
        .nd-history-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; margin-top: 8px; }
        .nd-history-meta {
          display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px;
          font-size: 10px; color: var(--text-tertiary);
        }
        .nd-history-meta-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
        /* tabular-nums: IP e horário não "dançam" de largura entre entradas do histórico. */
        .nd-history-meta-item { font-variant-numeric: tabular-nums; }
        .nd-history-action {
          display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 6px;
          font-size: 10px; font-weight: 700; color: var(--accent-blue);
          background: var(--accent-blue-light); border: 1px solid var(--accent-blue-light);
          cursor: pointer;
        }
        .nd-history-action:hover { border-color: var(--accent-blue); }
        .nd-clear-history {
          display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px;
          font-size: 11px; font-weight: 600; color: var(--text-tertiary);
          background: none; border: 1px solid var(--border-secondary); cursor: pointer;
        }
        .nd-clear-history:hover { color: var(--accent-rose); border-color: var(--accent-rose); background: var(--accent-rose-light); }
      `}</style>
    </div>
  );
}
