'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Plus, X, Loader2, CheckCircle2, AlertTriangle,
  ImagePlus, User, FileText, Hash, Sparkles, Clock,
  Zap, Bot, MessageSquare, ChevronDown, Wand2, ArrowUpRight,
  Layers, Target, PenTool, Upload, Image, Trash2
} from 'lucide-react';

interface DemandaResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface HistoryItem {
  texto: string;
  time: string;
  status: 'success' | 'error';
  response?: any;
}

const TEMPLATES = [
  { icon: '🐛', label: 'Bug Report', prompt: 'Encontrei um bug onde...' },
  { icon: '✨', label: 'Nova Feature', prompt: 'Preciso de uma funcionalidade que...' },
  { icon: '🔧', label: 'Melhoria', prompt: 'Gostaria de melhorar...' },
  { icon: '📋', label: 'Task', prompt: 'Precisamos realizar a seguinte tarefa...' },
];

interface UploadedImage {
  url: string;
  filename: string;
  preview?: string;
}

export default function NovaDemandaPage() {
  const [texto, setTexto] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [referencia, setReferencia] = useState('Painel Externo');
  const [urlsImagens, setUrlsImagens] = useState<string[]>([]);
  const [novaUrl, setNovaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemandaResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');
  const [showMeta, setShowMeta] = useState(false);
  const [focusEditor, setFocusEditor] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 5000);
    return () => clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(220, Math.min(textareaRef.current.scrollHeight, 500)) + 'px';
    }
  }, [texto]);

  const addImageUrl = () => {
    if (novaUrl.trim()) { setUrlsImagens([...urlsImagens, novaUrl.trim()]); setNovaUrl(''); }
  };

  const applyTemplate = (prompt: string) => {
    setTexto(prompt);
    textareaRef.current?.focus();
  };

  // Upload file helper
  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const preview = URL.createObjectURL(file);
        const img: UploadedImage = { url: data.url, filename: data.filename, preview };
        setUploadedImages(prev => [...prev, img]);
        setUrlsImagens(prev => [...prev, data.url]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
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
    setLoading(true);
    setResult(null);

    const body: any = { texto: texto.trim() };
    if (nomeCliente.trim()) body.nome_cliente = nomeCliente.trim();
    if (referencia.trim()) body.referencia = referencia.trim();
    if (urlsImagens.length > 0) body.urls_imagens = urlsImagens;

    try {
      const res = await fetch('/api/criar-demanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, data });
        setHistory([{ texto: texto.trim().slice(0, 120), time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'success', response: data }, ...history]);
        setTexto(''); setNomeCliente(''); setUrlsImagens([]); setReferencia('Painel Externo'); setShowMeta(false);
      } else {
        setResult({ success: false, error: data.error || data.details?.detail?.[0]?.msg || 'Erro desconhecido' });
        setHistory([{ texto: texto.trim().slice(0, 120), time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'error' }, ...history]);
      }
    } catch {
      setResult({ success: false, error: 'Não foi possível conectar ao bot em localhost:8000' });
    } finally {
      setLoading(false);
    }
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
            <form onSubmit={handleSubmit} className="nd-form">
              {/* Templates */}
              {!texto && (
                <div className="nd-templates">
                  <p className="nd-templates-label">
                    <Layers size={13} /> Começar com template
                  </p>
                  <div className="nd-templates-grid">
                    {TEMPLATES.map((t) => (
                      <button key={t.label} type="button" onClick={() => applyTemplate(t.prompt)} className="nd-template-card">
                        <span className="nd-template-icon">{t.icon}</span>
                        <span className="nd-template-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor */}
              <div className={`nd-editor ${focusEditor ? 'focused' : ''}`}>
                <div className="nd-editor-header">
                  <div className="nd-editor-dots">
                    <span /><span /><span />
                  </div>
                  <span className="nd-editor-title">demanda.md</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onFocus={() => setFocusEditor(true)}
                  onBlur={() => setFocusEditor(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(e as any); } }}
                  placeholder="Descreva sua demanda com o máximo de detalhes...

O bot Gemini irá analisar o texto e criar a issue no Jira com o tipo, prioridade, descrição e componentes adequados."
                  className="nd-editor-textarea"
                  required
                />
              </div>

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
                  accept="image/*"
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
                      <p className="nd-dropzone-title">Arraste imagens aqui, cole (Ctrl+V) ou clique para selecionar</p>
                      <p className="nd-dropzone-hint">PNG, JPG, GIF — até 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="nd-dropzone-gallery" onClick={(e) => e.stopPropagation()}>
                    <div className="nd-gallery-grid">
                      {uploadedImages.map((img, i) => (
                        <div key={i} className="nd-gallery-item">
                          {img.preview && (
                            <img src={img.preview} alt={img.filename} className="nd-gallery-thumb" />
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
                      <Image size={11} /> Cole com Ctrl+V ou arraste mais imagens
                    </p>
                  </div>
                )}
              </div>

              {/* Meta toggle */}
              <button type="button" onClick={() => setShowMeta(!showMeta)} className="nd-meta-toggle">
                <Plus size={14} className={`nd-meta-toggle-icon ${showMeta ? 'open' : ''}`} />
                <span>{showMeta ? 'Ocultar detalhes' : 'Adicionar cliente, referência ou imagens por URL'}</span>
                <ChevronDown size={14} className={`nd-meta-chevron ${showMeta ? 'open' : ''}`} />
              </button>

              {/* Meta fields */}
              {showMeta && (
                <div className="nd-meta animate-fade-in">
                  <div className="nd-meta-row">
                    <div className="nd-input-group">
                      <label><User size={11} /> Cliente</label>
                      <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome do cliente" />
                    </div>
                    <div className="nd-input-group">
                      <label><Hash size={11} /> Referência</label>
                      <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Painel Externo" />
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
                <div className="nd-tips">
                  {['🎯 Seja específico', '📋 Critérios de aceite', '🤖 IA define tipo e prioridade'].map((t) => (
                    <span key={t} className="nd-tip">{t}</span>
                  ))}
                </div>
                <button type="submit" disabled={loading || !texto.trim()} className="nd-submit-btn">
                  {loading ? (
                    <><Loader2 size={17} className="animate-spin" /> Processando...</>
                  ) : (
                    <><Sparkles size={16} /> Criar Demanda <kbd className="nd-kbd">Ctrl ↵</kbd></>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ── HISTORY VIEW ── */
            <div className="nd-history">
              {history.length === 0 ? (
                <div className="nd-history-empty">
                  <div className="nd-history-empty-icon"><Clock size={32} /></div>
                  <p>Nenhuma demanda enviada nesta sessão</p>
                </div>
              ) : (
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
                        </div>
                        <p className="nd-history-text">{h.texto}</p>
                        {h.response && (
                          <pre className="nd-history-json">{JSON.stringify(h.response, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                  <p className="nd-connection-name">Gemini CLI Bot</p>
                  <p className="nd-connection-url">localhost:8000</p>
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

      {/* Toast */}
      {result && (
        <div className={`nd-toast ${result.success ? 'success' : 'error'} animate-fade-in`}>
          {result.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div className="nd-toast-content">
            <p className="nd-toast-title">{result.success ? '✨ Demanda criada!' : 'Falha ao criar'}</p>
            {result.error && <p className="nd-toast-desc">{result.error}</p>}
            {result.success && result.data && (
              <pre className="nd-toast-json">{JSON.stringify(result.data, null, 2)}</pre>
            )}
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
      `}</style>
    </div>
  );
}
