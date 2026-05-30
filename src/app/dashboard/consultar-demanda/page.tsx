'use client';

import React, { useState } from 'react';
import {
  Search, Loader2, CheckCircle2, AlertTriangle, X, ExternalLink,
  FileText, User, Tag, Clock, Edit3, Save, RefreshCw, ArrowUpRight,
  Sparkles, Building2, Image as ImageIcon, Send
} from 'lucide-react';

interface DemandaData {
  success: boolean;
  issue_key: string;
  summary: string | null;
  texto: string | null;
  nome_cliente: string | null;
  referencia: string | null;
  urls_imagens: string[];
  status: string | null;
  issuetype: string | null;
  priority: string | null;
  assignee: string | null;
  created: string | null;
  updated: string | null;
  url: string;
  raw: any;
}

export default function ConsultarDemandaPage() {
  const [searchKey, setSearchKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [demanda, setDemanda] = useState<DemandaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTexto, setEditTexto] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCliente, setEditCliente] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSearch = async () => {
    let key = searchKey.trim();
    if (!key) return;
    // Auto-prepend DSMM- if user typed just a number
    if (/^\d+$/.test(key)) key = `DSMM-${key}`;
    key = key.toUpperCase();

    setLoading(true);
    setError(null);
    setDemanda(null);
    setEditing(false);
    setUpdateResult(null);

    try {
      const res = await fetch(`/api/demanda/${key}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setDemanda(data);
        setEditTexto(data.texto || '');
        setEditSummary(data.summary || '');
        setEditCliente(data.nome_cliente || '');
      } else {
        setError(data.error || 'Demanda não encontrada');
      }
    } catch {
      setError('Erro de conexão ao consultar demanda');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!demanda) return;
    setUpdating(true);
    setUpdateResult(null);

    const body: any = {};
    if (editTexto !== (demanda.texto || '')) body.texto = editTexto;
    if (editSummary !== (demanda.summary || '')) body.summary = editSummary;
    if (editCliente !== (demanda.nome_cliente || '')) body.nome_cliente = editCliente;

    if (Object.keys(body).length === 0) {
      setUpdateResult({ success: false, message: 'Nenhuma alteração detectada' });
      setUpdating(false);
      return;
    }

    try {
      const res = await fetch(`/api/atualizar-demanda/${demanda.issue_key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUpdateResult({ success: true, message: data.message || 'Atualizada com sucesso!' });
        setEditing(false);
        // Reload the demand
        setTimeout(() => handleSearch(), 1500);
      } else {
        setUpdateResult({ success: false, message: data.error || 'Erro ao atualizar' });
      }
    } catch {
      setUpdateResult({ success: false, message: 'Erro de conexão' });
    } finally {
      setUpdating(false);
    }
  };

  const issueTypeColor = (type: string | null) => {
    switch (type) {
      case 'Bug': return { bg: 'rgba(244,63,94,0.12)', color: '#FB7185', border: 'rgba(244,63,94,0.15)' };
      case 'Story': return { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: 'rgba(34,197,94,0.15)' };
      default: return { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: 'rgba(59,130,246,0.15)' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 0' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.12)',
          }}>
            <Search size={20} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Consultar & Editar Demanda
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Digite o número da demanda (ex: 86) para visualizar e atualizar
            </p>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '24px',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 16px', borderRadius: '14px', height: '48px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          transition: 'border-color 0.2s',
        }}>
          <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-tertiary)', flexShrink: 0 }}>DSMM-</span>
          <input
            type="text"
            value={searchKey}
            onChange={e => setSearchKey(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="86"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          />
          {searchKey && (
            <button onClick={() => { setSearchKey(''); setDemanda(null); setError(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchKey.trim()}
          style={{
            padding: '0 24px', borderRadius: '14px', height: '48px',
            background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
            color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderRadius: '14px',
          background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.12)',
          marginBottom: '20px',
        }}>
          <AlertTriangle size={18} style={{ color: '#FB7185', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#FB7185' }}>{error}</span>
        </div>
      )}

      {/* ── Update Result ── */}
      {updateResult && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', borderRadius: '14px', marginBottom: '20px',
          background: updateResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)',
          border: `1px solid ${updateResult.success ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)'}`,
        }}>
          {updateResult.success ? <CheckCircle2 size={16} style={{ color: '#4ADE80' }} /> : <AlertTriangle size={16} style={{ color: '#FB7185' }} />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: updateResult.success ? '#4ADE80' : '#FB7185' }}>{updateResult.message}</span>
        </div>
      )}

      {/* ── Demanda Card ── */}
      {demanda && (
        <div className="animate-fade-in" style={{
          borderRadius: '20px', overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          {/* Top gradient bar */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #A78BFA)' }} />

          {/* ── Card Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--border-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{
                fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {demanda.issue_key}
              </span>
              {demanda.issuetype && (() => {
                const c = issueTypeColor(demanda.issuetype);
                return (
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                  }}>
                    {demanda.issuetype}
                  </span>
                );
              })()}
              {demanda.status && (
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: 'rgba(245,158,11,0.1)', color: '#FBBF24',
                  border: '1px solid rgba(245,158,11,0.12)',
                }}>
                  {demanda.status}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => { setEditing(!editing); setUpdateResult(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                  background: editing ? 'rgba(244,63,94,0.08)' : 'rgba(99,102,241,0.08)',
                  color: editing ? '#FB7185' : '#818CF8', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {editing ? <><X size={14} /> Cancelar</> : <><Edit3 size={14} /> Editar</>}
              </button>
              <a href={demanda.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  color: '#fff', textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.2)',
                }}>
                Jira <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          {/* ── Card Body ── */}
          <div style={{ padding: '24px' }}>

            {/* Summary */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                <FileText size={12} /> Título
              </label>
              {editing ? (
                <input
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              ) : (
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                  {demanda.summary || '—'}
                </p>
              )}
            </div>

            {/* Texto / Descrição */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                <Sparkles size={12} /> Descrição (Texto)
              </label>
              {editing ? (
                <textarea
                  value={editTexto}
                  onChange={e => setEditTexto(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)', outline: 'none', resize: 'vertical',
                    lineHeight: 1.6, fontFamily: 'inherit',
                  }}
                />
              ) : (
                <div style={{
                  padding: '14px 18px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.7,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {demanda.texto || 'Sem descrição'}
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px',
            }}>
              {/* Cliente */}
              <div style={{
                padding: '14px 18px', borderRadius: '12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  <Building2 size={11} /> Cliente
                </label>
                {editing ? (
                  <input
                    value={editCliente}
                    onChange={e => setEditCliente(e.target.value)}
                    placeholder="Nome do cliente"
                    style={{
                      width: '100%', padding: '6px 0', background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--border-primary)', outline: 'none',
                      color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                    }}
                  />
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {demanda.nome_cliente || '—'}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div style={{
                padding: '14px 18px', borderRadius: '12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  <Tag size={11} /> Prioridade
                </label>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {demanda.priority || '—'}
                </p>
              </div>

              {/* Assignee */}
              <div style={{
                padding: '14px 18px', borderRadius: '12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  <User size={11} /> Responsável
                </label>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {demanda.assignee || 'Não atribuído'}
                </p>
              </div>

              {/* Dates */}
              <div style={{
                padding: '14px 18px', borderRadius: '12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  <Clock size={11} /> Atualizado
                </label>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {demanda.updated ? new Date(demanda.updated).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {demanda.urls_imagens && demanda.urls_imagens.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  <ImageIcon size={12} /> Anexos ({demanda.urls_imagens.length})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {demanda.urls_imagens.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(99,102,241,0.06)', color: '#818CF8',
                        border: '1px solid rgba(99,102,241,0.1)', textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}>
                      <ExternalLink size={12} /> Anexo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Save button when editing */}
            {editing && (
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700,
                    background: updating ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#fff', border: 'none', cursor: updating ? 'wait' : 'pointer',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.2)',
                    transition: 'all 0.2s',
                  }}
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {updating ? 'Atualizando...' : 'Salvar alterações'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !demanda && !error && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.05))',
            border: '1px solid rgba(99,102,241,0.08)', marginBottom: '16px',
          }}>
            <Search size={28} style={{ color: 'rgba(129,140,248,0.4)' }} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            Digite o número da demanda acima
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Ex: 86, 84, 47
          </p>
        </div>
      )}
    </div>
  );
}
