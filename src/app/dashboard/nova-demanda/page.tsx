'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Plus, X, Loader2, CheckCircle2, AlertTriangle,
  ImagePlus, User, FileText, Hash, Sparkles, Clock,
  Zap, Bot, MessageSquare, ChevronDown, Wand2, ArrowUpRight,
  Layers, Target, PenTool, Upload, Image, Trash2,
  Mic, MicOff, Eye, EyeOff, Copy, Shield, RotateCcw, AlertCircle
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { CLIENTS } from '@/lib/clients';

interface DemandaResult {
  success: boolean;
  data?: any;
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
  response?: any;
}

const TEMPLATES = [
  { icon: '🐛', label: 'Bug Report', prompt: 'Encontrei um bug onde...', shortcut: '1' },
  { icon: '✨', label: 'Nova Feature', prompt: 'Preciso de uma funcionalidade que...', shortcut: '2' },
  { icon: '🔧', label: 'Melhoria', prompt: 'Gostaria de melhorar...', shortcut: '3' },
  { icon: '📋', label: 'Task', prompt: 'Precisamos realizar a seguinte tarefa...', shortcut: '4' },
];

const PRIORITIES = [
  { value: '', label: 'Auto (IA decide)', color: '#94A3B8' },
  { value: 'Highest', label: '🔴 Crítica', color: '#EF4444' },
  { value: 'High', label: '🟠 Alta', color: '#F97316' },
  { value: 'Medium', label: '🟡 Média', color: '#EAB308' },
  { value: 'Low', label: '🟢 Baixa', color: '#22C55E' },
  { value: 'Lowest', label: '⚪ Mínima', color: '#6B7280' },
];

const URGENCIES = [
  { value: '', label: 'Normal' },
  { value: 'urgente', label: '🚨 Urgente' },
  { value: 'critico', label: '🔥 Crítico — parou produção' },
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
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');
  const [showMeta, setShowMeta] = useState(false);
  const [focusEditor, setFocusEditor] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [currentBodyParams, setCurrentBodyParams] = useState<any>(null);
  const [validationWarn, setValidationWarn] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, ImageExtension.configure({ inline: true })],
    content: texto,
    immediatelyRender: false,
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
        try { localStorage.setItem('jiraops-demanda-draft', JSON.stringify({ texto, nomeCliente, referencia, prioridade, urgencia })); } catch {}
      }
    }, 500);
  }, [texto, nomeCliente, referencia, prioridade, urgencia]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem('jiraops-demanda-draft');
      if (draft) {
        const d = JSON.parse(draft);
        if (d.texto) { setTexto(d.texto); setNomeCliente(d.nomeCliente || ''); setReferencia(d.referencia || 'CONSOLE'); setPrioridade(d.prioridade || ''); setUrgencia(d.urgencia || ''); setShowMeta(!!d.nomeCliente || !!d.prioridade || !!d.urgencia); }
      }
    } catch {}
  }, []);

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

  const enhanceText = async () => {
    const htmlContent = editor?.getHTML() || texto;
    if (!htmlContent.trim() || htmlContent === '<p></p>') return;
    
    setEnhancing(true);
    try {
      const res = await fetch('/api/aprimorar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: htmlContent })
      });
      const data = await res.json();
      if (res.ok && data.success && data.text) {
        editor?.commands.setContent(data.text);
        setTexto(data.text);
      } else {
        alert(data.error || 'Erro ao aprimorar texto');
      }
    } catch (err) {
      alert('Falha na conexão com a API de aprimoramento');
    } finally {
      setEnhancing(false);
    }
  };

  // Upload file helper
  const ALLOWED_TYPES = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats', 'text/plain', 'text/csv'];
  const uploadFile = async (file: File) => {
    const isAllowed = ALLOWED_TYPES.some(t => file.type.startsWith(t));
    if (!isAllowed) {
      alert(`Tipo de arquivo não suportado: ${file.type}`);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Arquivo muito grande (máx 15MB)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const isImage = file.type.startsWith('image/');
        const preview = isImage ? URL.createObjectURL(file) : undefined;
        // Use displayName if available, fallback to filename or original name
        const finalFilename = data.displayName || data.filename || file.name;
        const img: UploadedImage = { url: data.url, filename: finalFilename, preview, isImage, type: file.type };
        setUploadedImages(prev => [...prev, img]);
        setUrlsImagens(prev => [...prev, data.url]);
        
        // Insert visual image into the editor
        if (editor) {
          editor.commands.insertContent(`<br/><img src="${data.url}" alt="${finalFilename}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" /><br/>`);
        } else {
          setTexto(prev => prev + `<br/><img src="${data.url}" alt="${finalFilename}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" /><br/>`);
        }
      } else {
        alert(data.error || 'Erro no upload');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Falha no upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  // Handle paste (Ctrl+V image)
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
        // Substituir a imagem pelo marcador de texto
        const textNode = doc.createTextNode(`\n[Anexo: ${filename}]\n`);
        img.parentNode?.replaceChild(textNode, img);
      }
    });

    const textoLimpo = doc.body.innerHTML;

    const body: any = { texto: textoLimpo };
    if (nomeCliente.trim()) body.nome_cliente = nomeCliente.trim();
    if (referencia.trim()) body.referencia = referencia.trim();
    if (urlsImagens.length > 0) body.urls_imagens = urlsImagens; // legacy fallback
    
    // Unir os arquivos das imagens embutidas (do quill) com os uploads da dropzone
    const todosArquivos = [...uploadedImages.map(img => ({ url: img.url, filename: img.filename })), ...extractedArquivos];
    // Evitar duplicatas baseadas na URL
    const map = new Map(todosArquivos.map(i => [i.url, i]));
    
    if (map.size > 0) {
      body.arquivos = Array.from(map.values());
    }
    if (prioridade) body.prioridade = prioridade;
    if (urgencia) body.texto = `[${urgencia.toUpperCase()}] ${body.texto}`;

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
    setPreviewData(null); // Fecha o modal de preview

    // Simulate progress steps for actual creation
    const stepInterval = setInterval(() => {
      setProgressStep(prev => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const bodyFinal = { ...currentBodyParams, issueDataPreGerado: previewData };
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
        const newHistory = [{ texto: texto.trim().slice(0, 120), nomeCliente, referencia, prioridade, urgencia, time: now, status: 'success' as const, response: data }, ...history];
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Seu navegador não suporta reconhecimento de voz'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
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
    if (item.prioridade) setPrioridade(item.prioridade);
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

  // Simple markdown to HTML
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.1);padding:2px 6px;border-radius:4px;font-size:12px">$1</code>')
      .replace(/^- (.*)/gm, '• $1')
      .replace(/\n/g, '<br/>');
  };

  const charCount = texto.trim().length;

  return (
    <div className="nd-root">
      {/* ───── HERO ───── */}
      <div className="nd-hero">
        <div className="nd-hero-grid" />
        <div className="nd-hero-orb nd-hero-orb-1" />
        <div className="nd-hero-orb nd-hero-orb-2" />
        <div className="nd-hero-orb nd-hero-orb-3" />
        <div className="nd-hero-noise" />

        <div className="nd-hero-content">
          <div className="nd-hero-left">
            <div className="nd-hero-icon">
              <Wand2 size={24} color="#fff" />
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
              <div className="nd-pulse" />
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
              <div className="nd-preview-modal animate-fade-in" style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="#8B5CF6" />
                  <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>Revisão da IA ({previewData.issuetype || 'Task'})</h2>
                </div>
                
                <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Título gerado:</div>
                  <strong style={{ fontSize: '15px' }}>{previewData.summary}</strong>
                </div>

                <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #334155', maxHeight: '400px', overflowY: 'auto' }}>
                   <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px' }}>Descrição estruturada:</div>
                   <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#CBD5E1', fontFamily: 'monospace' }}>{previewData.description}</pre>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {loading && <Loader2 size={16} className="animate-spin" color="#8B5CF6" />}
                  <button type="button" onClick={() => setPreviewData(null)} disabled={loading} style={{ background: 'transparent', border: '1px solid #334155', color: '#CBD5E1', padding: '10px 16px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
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
                      <button key={t.label} type="button" onClick={() => applyTemplate(t.prompt)} className="nd-template-card">
                        <span className="nd-template-icon">{t.icon}</span>
                        <span className="nd-template-label">{t.label}</span>
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
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {texto.trim() && (
                      <span className="nd-draft-badge">
                        <CheckCircle2 size={9} /> rascunho salvo
                      </span>
                    )}
                    <button type="button" onClick={enhanceText} disabled={enhancing || !texto.trim() || texto === '<p></p>'} className="nd-editor-btn" title="Aprimorar texto com IA" style={{ color: '#8B5CF6' }}>
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
                  <div className="nd-preview" dangerouslySetInnerHTML={{ __html: texto }} />
                ) : (
                  <div className="nd-editor-textarea" style={{ padding: '16px' }} onClick={() => editor?.commands.focus()}>
                    <EditorContent editor={editor} />
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
                            <div className="nd-gallery-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.08)', fontSize: '10px', fontWeight: 700, color: 'var(--accent-violet)', textTransform: 'uppercase' }}>
                              {(img.type || '').split('/').pop()?.replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx').replace('vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx').slice(0, 4) || 'FILE'}
                            </div>
                          )}
                          <span className="nd-gallery-name">{img.filename}</span>
                          <button type="button" onClick={() => removeUploadedImage(i)} className="nd-gallery-remove" title="Remover">
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
                      <Image size={11} /> Cole com Ctrl+V ou arraste mais arquivos
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
                        {CLIENTS.map(c => <option key={c.id} value={c.name} />)}
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
                    {['🎯 Seja específico', '📋 Critérios de aceite', '🤖 IA define tipo'].map((t) => (
                      <span key={t} className="nd-tip">{t}</span>
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
                            {h.prioridade && <span className="nd-history-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>{h.prioridade}</span>}
                            {h.urgencia && <span className="nd-history-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>{h.urgencia}</span>}
                          </div>
                          <p className="nd-history-text">{h.texto}</p>
                          {h.response && (
                            <pre className="nd-history-json">{JSON.stringify(h.response, null, 2)}</pre>
                          )}
                          <div className="nd-history-actions">
                            <button type="button" onClick={() => duplicateFromHistory(h)} className="nd-history-action" title="Reutilizar esta demanda">
                              <Copy size={12} /> Duplicar
                            </button>
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
                { n: '1', icon: <PenTool size={14} />, title: 'Descreva', desc: 'Escreva em linguagem natural', color: '#6366F1' },
                { n: '2', icon: <Wand2 size={14} />, title: 'IA Processa', desc: 'Gemini analisa e classifica', color: '#8B5CF6' },
                { n: '3', icon: <Zap size={14} />, title: 'Jira', desc: 'Issue criada automaticamente', color: '#A78BFA' },
              ].map((s, i) => (
                <div key={i} className="nd-step">
                  <div className="nd-step-icon" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
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
                  <Bot size={15} color="#fff" />
                </div>
                <div>
                  <p className="nd-connection-name">API Bot Jira</p>
                  <p className="nd-connection-url">apibotjira.vercel.app</p>
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
          borderRadius: '20px', overflow: 'hidden',
          background: 'linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)',
        }}>
          {/* Top gradient bar */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #22C55E, #3B82F6, #8B5CF6)' }} />

          {/* Header */}
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                border: '1px solid rgba(34,197,94,0.15)',
              }}>
                <CheckCircle2 size={16} style={{ color: '#4ADE80' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ADE80' }}>Demanda criada!</span>
            </div>
            <button onClick={() => setResult(null)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'rgba(148,163,184,0.5)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            ><X size={14} /></button>
          </div>

          {/* Issue Key — Big Badge */}
          <div style={{ padding: '16px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {result.data.issue_key}
            </span>
            {result.data.issuetype && (
              <span style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: result.data.issuetype === 'Bug' ? 'rgba(244,63,94,0.12)' : result.data.issuetype === 'Story' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                color: result.data.issuetype === 'Bug' ? '#FB7185' : result.data.issuetype === 'Story' ? '#4ADE80' : '#60A5FA',
                border: `1px solid ${result.data.issuetype === 'Bug' ? 'rgba(244,63,94,0.15)' : result.data.issuetype === 'Story' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)'}`,
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
                color: 'rgba(226,232,240,0.7)', margin: 0,
              }}>
                {result.data.summary}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <a
              href={result.data.url || `https://movingpay.atlassian.net/browse/${result.data.issue_key}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#fff', textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(59,130,246,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.25)'; }}
            >
              Abrir no Jira
              <ArrowUpRight size={14} />
            </a>
            <button
              onClick={() => setResult(null)}
              style={{
                padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(226,232,240,0.6)', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(226,232,240,0.6)'; }}
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
            <p className="nd-toast-title">{result.success ? '✨ Demanda criada!' : 'Falha ao criar'}</p>
            {result.error && <p className="nd-toast-desc">{result.error}</p>}
            {result.success && result.data?.message && <p className="nd-toast-desc">{result.data.message}</p>}
          </div>
          <button onClick={() => setResult(null)} className="nd-toast-close"><X size={16} /></button>
        </div>
      )}

      <style jsx>{`
        /* ========== ROOT ========== */
        .nd-root { display: flex; flex-direction: column; height: 100%; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-primary); background: var(--bg-card); }

        /* ========== HERO ========== */
        .nd-hero {
          position: relative; flex-shrink: 0; overflow: hidden;
          background: linear-gradient(140deg, #080C18 0%, #0F1629 30%, #161340 60%, #0D0B22 100%);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .nd-hero-grid {
          position: absolute; inset: 0; opacity: 0.03;
          background-image: linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .nd-hero-noise {
          position: absolute; inset: 0; opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .nd-hero-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .nd-hero-orb-1 { width: 250px; height: 250px; background: rgba(99,102,241,0.2); top: -80px; right: 15%; animation: ndOrb 8s ease-in-out infinite; }
        .nd-hero-orb-2 { width: 180px; height: 180px; background: rgba(168,85,247,0.15); bottom: -60px; left: 25%; animation: ndOrb 11s ease-in-out infinite reverse; }
        .nd-hero-orb-3 { width: 120px; height: 120px; background: rgba(59,130,246,0.1); top: 30%; right: 40%; animation: ndOrb 14s ease-in-out infinite; }
        @keyframes ndOrb { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.08); } }

        .nd-hero-content { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 28px 32px; }
        .nd-hero-left { display: flex; align-items: center; gap: 16px; }
        .nd-hero-icon {
          width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%);
          box-shadow: 0 8px 28px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .nd-hero-title { font-size: 20px; font-weight: 800; color: #F1F5F9; letter-spacing: -0.02em; }
        .nd-hero-subtitle { font-size: 13px; color: rgba(148,163,184,0.65); margin-top: 2px; }
        .nd-hero-right { display: flex; align-items: center; gap: 10px; }
        .nd-stat { display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: rgba(148,163,184,0.6); font-size: 11px; font-weight: 600; }
        .nd-stat-value { color: #E2E8F0; font-weight: 800; font-variant-numeric: tabular-nums; }
        .nd-bot-status { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.12); color: #4ADE80; font-size: 11px; font-weight: 700; }
        .nd-pulse { width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 8px rgba(34,197,94,0.5); animation: ndP 2s ease-in-out infinite; }
        @keyframes ndP { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ========== BODY ========== */
        .nd-body { flex: 1; display: flex; overflow: hidden; }
        .nd-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }

        /* ========== TABS ========== */
        .nd-tabs { display: flex; align-items: center; gap: 4px; padding: 16px 28px 0; }
        .nd-tab {
          display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px;
          font-size: 12px; font-weight: 600; color: var(--text-tertiary); background: none;
          border: 1px solid transparent; cursor: pointer; transition: all 0.15s;
        }
        .nd-tab:hover { background: var(--bg-secondary); color: var(--text-secondary); }
        .nd-tab.active { background: var(--bg-card); border-color: var(--border-primary); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .nd-tab-count { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 999px; background: var(--accent-blue); color: #fff; }
        .nd-tabs-spacer { flex: 1; }
        .nd-char-count { font-size: 11px; font-family: monospace; color: var(--text-tertiary); }
        .nd-char-count .active { color: var(--accent-blue); font-weight: 700; }

        /* ========== FORM ========== */
        .nd-form { flex: 1; display: flex; flex-direction: column; }

        /* Templates */
        .nd-templates { padding: 16px 28px 0; }
        .nd-templates-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
        .nd-templates-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .nd-template-card {
          display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 12px;
          background: var(--bg-secondary); border: 1px solid var(--border-secondary); cursor: pointer; transition: all 0.2s;
        }
        .nd-template-card:hover { border-color: var(--accent-blue); background: var(--accent-blue-light); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .nd-template-icon { font-size: 20px; }
        .nd-template-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }

        /* Editor */
        .nd-editor {
          margin: 16px 28px 0; border-radius: 14px; overflow: hidden;
          background: var(--bg-secondary); border: 2px solid var(--border-primary);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .nd-editor.focused { border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .nd-editor-header {
          display: flex; align-items: center; gap: 10px; padding: 10px 16px;
          background: var(--bg-card); border-bottom: 1px solid var(--border-secondary);
        }
        .nd-editor-dots { display: flex; gap: 5px; }
        .nd-editor-dots span { width: 8px; height: 8px; border-radius: 50%; }
        .nd-editor-dots span:nth-child(1) { background: #FF5F57; }
        .nd-editor-dots span:nth-child(2) { background: #FFBD2E; }
        .nd-editor-dots span:nth-child(3) { background: #28CA41; }
        .nd-editor-title { font-size: 11px; font-weight: 500; color: var(--text-tertiary); font-family: monospace; }
        .nd-editor-textarea {
          width: 100%; min-height: 220px; padding: 20px; background: transparent;
          border: none; outline: none; resize: none; font-size: 14px; line-height: 1.85;
          color: var(--text-primary); font-family: inherit;
        }
        .nd-editor-textarea::placeholder { color: var(--text-tertiary); opacity: 0.5; }

        /* Meta toggle */
        .nd-meta-toggle {
          display: flex; align-items: center; gap: 6px; margin: 12px 28px 0; padding: 0;
          font-size: 12px; font-weight: 600; color: var(--accent-blue); background: none; border: none; cursor: pointer;
        }
        .nd-meta-toggle-icon { transition: transform 0.2s; }
        .nd-meta-toggle-icon.open { transform: rotate(45deg); }
        .nd-meta-chevron { transition: transform 0.2s; }
        .nd-meta-chevron.open { transform: rotate(180deg); }

        /* Meta fields */
        .nd-meta { padding: 12px 28px 0; }
        .nd-meta-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
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
          padding: 16px 28px; margin-top: auto; flex-shrink: 0;
          border-top: 1px solid var(--border-primary); background: var(--bg-card);
        }
        .nd-tips { display: flex; gap: 16px; }
        .nd-tip { font-size: 11px; color: var(--text-tertiary); }
        .nd-submit-btn {
          display: flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 11px;
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #fff;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3); transition: all 0.2s;
        }
        .nd-submit-btn:hover { box-shadow: 0 8px 28px rgba(99,102,241,0.4); transform: translateY(-1px); }
        .nd-submit-btn:active { transform: scale(0.97); }
        .nd-submit-btn:disabled { background: var(--bg-card-hover); color: var(--text-tertiary); box-shadow: none; cursor: not-allowed; transform: none; }
        .nd-kbd { font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.15); font-family: monospace; margin-left: 2px; }

        /* ========== DROPZONE ========== */
        .nd-dropzone {
          margin: 14px 28px 0; border-radius: 12px; cursor: pointer;
          border: 2px dashed var(--border-primary); padding: 16px;
          transition: all 0.2s; background: var(--bg-secondary);
        }
        .nd-dropzone:hover { border-color: var(--accent-blue); background: rgba(99,102,241,0.03); }
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
          position: relative; border-radius: 10px; overflow: hidden; background: var(--bg-card);
          border: 1px solid var(--border-secondary); display: flex; flex-direction: column; transition: all 0.15s;
        }
        .nd-gallery-item:hover { border-color: var(--accent-blue); }
        .nd-gallery-thumb { width: 100%; height: 80px; object-fit: cover; display: block; }
        .nd-gallery-name { font-size: 9px; font-weight: 600; color: var(--text-tertiary); padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nd-gallery-remove {
          position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;
          background: rgba(0,0,0,0.6); color: #fff; opacity: 0; transition: opacity 0.15s;
        }
        .nd-gallery-item:hover .nd-gallery-remove { opacity: 1; }
        .nd-gallery-add {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          border-radius: 10px; border: 2px dashed var(--border-primary); background: transparent;
          color: var(--text-tertiary); cursor: pointer; min-height: 106px; transition: all 0.15s;
          font-size: 10px; font-weight: 600;
        }
        .nd-gallery-add:hover { border-color: var(--accent-blue); color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-gallery-paste-hint {
          display: flex; align-items: center; gap: 4px; margin-top: 8px;
          font-size: 10px; color: var(--text-tertiary);
        }
        .hidden { display: none; }

        /* ========== HISTORY ========== */
        .nd-history { flex: 1; padding: 20px 28px; }
        .nd-history-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; }
        .nd-history-empty-icon { width: 64px; height: 64px; border-radius: 20px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: var(--text-tertiary); }
        .nd-history-empty p { color: var(--text-tertiary); font-size: 13px; }
        .nd-history-list { display: flex; flex-direction: column; gap: 10px; }
        .nd-history-item { display: flex; gap: 12px; padding: 16px; border-radius: 12px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); }
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
        .nd-sidebar { width: 260px; flex-shrink: 0; border-left: 1px solid var(--border-primary); background: var(--bg-card); overflow-y: auto; }
        .nd-sidebar-section { padding: 20px 20px; }
        .nd-sidebar-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-tertiary); margin-bottom: 14px; }
        .nd-sidebar-divider { height: 1px; margin: 0 20px; background: var(--border-secondary); }
        .nd-sidebar-empty { font-size: 11px; color: var(--text-tertiary); font-style: italic; }

        /* Steps */
        .nd-steps { display: flex; flex-direction: column; gap: 14px; }
        .nd-step { display: flex; gap: 10px; align-items: flex-start; }
        .nd-step-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-step-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
        .nd-step-desc { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }

        /* Connection */
        .nd-connection { padding: 12px; border-radius: 10px; background: var(--bg-secondary); border: 1px solid var(--border-secondary); }
        .nd-connection-row { display: flex; align-items: center; gap: 10px; }
        .nd-connection-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366F1, #8B5CF6); flex-shrink: 0; }
        .nd-connection-name { font-size: 11px; font-weight: 700; color: var(--text-primary); }
        .nd-connection-url { font-size: 9px; font-family: monospace; color: var(--text-tertiary); }
        .nd-connection-status { margin-left: auto; }
        .nd-pulse-sm { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px rgba(34,197,94,0.5); }

        /* Activity */
        .nd-activity { display: flex; flex-direction: column; gap: 8px; }
        .nd-activity-item { display: flex; align-items: center; gap: 8px; }
        .nd-activity-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .nd-activity-text { flex: 1; font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nd-activity-time { font-size: 9px; font-family: monospace; color: var(--text-tertiary); flex-shrink: 0; }

        /* ========== TOAST ========== */
        .nd-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200;
          display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: 14px;
          min-width: 420px; max-width: 640px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.2); animation: ndUp 0.3s ease-out;
        }
        .nd-toast.success { background: #065F46; color: #D1FAE5; border: 1px solid #059669; }
        .nd-toast.error { background: #7F1D1D; color: #FECACA; border: 1px solid #DC2626; }
        .nd-toast-content { flex: 1; min-width: 0; }
        .nd-toast-title { font-size: 13px; font-weight: 700; }
        .nd-toast-desc { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        .nd-toast-json { font-size: 10px; margin-top: 8px; padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.2); overflow-x: auto; font-family: monospace; max-height: 120px; }
        .nd-toast-close { background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; }
        .nd-toast-close:hover { opacity: 1; }
        @keyframes ndUp { from { transform: translateX(-50%) translateY(16px); opacity: 0; } to { transform: translateX(-50%); opacity: 1; } }

        @media (max-width: 900px) {
          .nd-sidebar { display: none; }
          .nd-templates-grid { grid-template-columns: repeat(2, 1fr); }
          .nd-meta-row { grid-template-columns: 1fr; }
        }

        /* ========== NEW FEATURES STYLES ========== */

        /* Editor buttons */
        .nd-editor-btn {
          width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-secondary);
          background: var(--bg-secondary); color: var(--text-tertiary); cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .nd-editor-btn:hover { border-color: var(--accent-blue); color: var(--accent-blue); background: var(--accent-blue-light); }
        .nd-editor-btn.recording { border-color: #EF4444; color: #EF4444; background: rgba(239,68,68,0.1); animation: ndP 1s ease-in-out infinite; }

        /* Draft saved badge */
        .nd-draft-badge {
          display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
          font-size: 9px; font-weight: 600; color: var(--accent-emerald); background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.1);
        }

        /* Template kbd hint */
        .nd-template-kbd {
          font-size: 9px; font-family: monospace; padding: 1px 5px; border-radius: 3px;
          background: rgba(255,255,255,0.06); color: var(--text-tertiary); margin-top: 2px;
        }

        /* Markdown Preview */
        .nd-preview {
          padding: 20px; min-height: 220px; font-size: 14px; line-height: 1.85;
          color: var(--text-primary);
        }
        .nd-preview strong { color: var(--accent-blue); }
        .nd-preview em { color: var(--accent-violet); font-style: italic; }

        /* Validation warning */
        .nd-editor.warn { border-color: #F59E0B; }
        .nd-validation-warn {
          display: flex; align-items: center; gap: 8px; margin: 8px 28px 0;
          padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600;
          background: rgba(245,158,11,0.06); color: #F59E0B;
          border: 1px solid rgba(245,158,11,0.12);
        }

        /* Voice indicator */
        .nd-voice-indicator {
          display: flex; align-items: center; gap: 10px; margin: 8px 28px 0;
          padding: 12px 16px; border-radius: 10px; font-size: 12px; font-weight: 600;
          background: rgba(239,68,68,0.06); color: #F87171;
          border: 1px solid rgba(239,68,68,0.12);
        }
        .nd-voice-dot {
          width: 10px; height: 10px; border-radius: 50%; background: #EF4444;
          animation: ndP 1s ease-in-out infinite; box-shadow: 0 0 8px rgba(239,68,68,0.5);
        }
        .nd-voice-stop {
          margin-left: auto; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;
          background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.2);
          cursor: pointer; transition: all 0.15s;
        }
        .nd-voice-stop:hover { background: rgba(239,68,68,0.25); }

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
          transition: all 0.3s;
        }
        .nd-progress-step.active { color: var(--accent-emerald); background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.15); }
        .nd-progress-step.current { color: var(--accent-blue); background: var(--accent-blue-light); border-color: rgba(59,130,246,0.15); }

        /* History actions */
        .nd-history-actions { display: flex; gap: 6px; margin-top: 8px; }
        .nd-history-action {
          display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 6px;
          font-size: 10px; font-weight: 700; color: var(--accent-blue);
          background: var(--accent-blue-light); border: 1px solid rgba(59,130,246,0.1);
          cursor: pointer; transition: all 0.15s;
        }
        .nd-history-action:hover { background: rgba(59,130,246,0.15); transform: translateY(-1px); }
        .nd-clear-history {
          display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px;
          font-size: 11px; font-weight: 600; color: var(--text-tertiary);
          background: none; border: 1px solid var(--border-secondary); cursor: pointer; transition: all 0.15s;
        }
        .nd-clear-history:hover { color: var(--accent-rose); border-color: var(--accent-rose); background: rgba(244,63,94,0.04); }
      `}</style>
    </div>
  );
}
