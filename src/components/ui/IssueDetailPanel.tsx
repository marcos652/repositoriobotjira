'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// ============================================
//  Painel de detalhe da demanda (modal)
// ============================================
//
// Reproduz o quadro do Jira: descrição à esquerda, campos à direita. A fonte é
// /api/demanda/[issueKey] — a mesma da tela de Consultar Demanda — e não /api/issue, porque ela
// já entrega PO, Tech Lead, Developer, Produto, Cliente, Saúde e Impacto mapeados, além do
// `textoHtml` renderizado pelo Jira (que preserva checklists e tabelas; o ADF→texto não).

interface Opcao { id: string; value: string }

interface Comentario {
  id: string;
  author: string;
  authorAvatar: string | null;
  body: string;
  bodyHtml: string | null;
  created: string;
}

interface Subtarefa {
  key: string;
  summary: string;
  status: string;
  issuetype: string;
}

interface Demanda {
  issue_key: string;
  summary: string;
  status: string | null;
  statusCategory: string | null;
  priority: string | null;
  issuetype: string | null;
  texto: string | null;
  textoHtml: string | null;
  reporter: string | null;      reporterAvatar: string | null;
  assignee: string | null;      assigneeAvatar: string | null;
  po: string | null;            poAvatar: string | null;
  techLead: string | null;      techLeadAvatar: string | null;
  developer: string | null;     developerAvatar: string | null;
  labels: string[];
  produto: Opcao[];
  cliente: Opcao[];
  nome_cliente: string | null;
  saude: Opcao | null;
  impacto: Opcao | null;
  dataInicio: string | null;
  plannedEnd: string | null;
  duedate: string | null;
  created: string | null;
  updated: string | null;
  timeTracking: { originalEstimate?: string; timeSpent?: string; remainingEstimate?: string } | null;
  subtasks: Subtarefa[];
  comments: Comentario[];
  url: string | null;
}

interface IssueDetailPanelProps {
  issueKey: string;
  onClose: () => void;
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  new:           { bg: 'var(--bg-secondary)',           color: 'var(--text-secondary)' },
  indeterminate: { bg: 'var(--accent-blue-light)',      color: 'var(--accent-blue-soft)' },
  done:          { bg: 'var(--accent-emerald-light)',   color: 'var(--accent-green-soft)' },
};

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Data-sem-hora do Jira montada como local: new Date('2026-08-17') seria meia-noite UTC. */
function formatarDia(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '—';
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function iniciais(nome: string): string {
  return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Linha "rótulo → valor" da barra lateral, no mesmo ritmo visual do painel do Jira. */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="idp-campo">
      <span className="idp-campo-label">{label}</span>
      <div className="idp-campo-valor">{children}</div>
    </div>
  );
}

/** Pessoa com avatar; "Nenhuma" quando o campo está vazio, como o Jira mostra. */
function Pessoa({ nome, avatar }: { nome: string | null; avatar: string | null }) {
  if (!nome) return <span className="idp-vazio">Nenhuma</span>;
  return (
    <span className="idp-pessoa">
      {avatar
        ? <img src={avatar} alt="" className="idp-avatar" />
        : <span className="idp-avatar idp-avatar-fallback">{iniciais(nome)}</span>}
      <span className="idp-pessoa-nome">{nome}</span>
    </span>
  );
}

export default function IssueDetailPanel({ issueKey, onClose }: IssueDetailPanelProps) {
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/demanda/${issueKey}`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('Falha ao carregar');
          return res.json();
        })
        .then(data => { setDemanda(data); setLoading(false); })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
          setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar');
          setLoading(false);
        });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [issueKey]);

  // Esc fecha; Tab circula dentro do painel; ao sair, o foco volta para quem o abriu.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handler);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const d = demanda;
  const sStyle = statusStyle[d?.statusCategory || 'new'] || statusStyle.new;
  const temTempo = !!(d?.timeTracking?.originalEstimate || d?.timeTracking?.timeSpent);

  return (
    <>
      <div className="idp-overlay" onClick={onClose} aria-hidden="true" />

      <div className="idp-modal" role="dialog" aria-modal="true" aria-label={`Demanda ${issueKey}`} ref={panelRef}>
        {/* Cabeçalho */}
        <div className="idp-head">
          <span className="idp-key">{issueKey}</span>
          <div className="idp-head-acoes">
            {d?.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="idp-icon-btn" title="Abrir no Jira">
                <ExternalLink size={15} />
              </a>
            )}
            <button ref={closeButtonRef} onClick={onClose} className="idp-icon-btn" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="idp-estado">
            <Loader2 size={30} className="animate-spin" style={{ color: 'var(--accent-indigo-soft)' }} />
            <p>Carregando {issueKey}...</p>
          </div>
        ) : error || !d ? (
          <div className="idp-estado">
            <AlertTriangle size={30} style={{ color: 'var(--accent-rose-soft)' }} />
            <p>{error || 'Demanda não encontrada'}</p>
          </div>
        ) : (
          <div className="idp-corpo">
            {/* ── Coluna esquerda ── */}
            <div className="idp-esq">
              <h2 className="idp-titulo">{d.summary}</h2>

              <div className="idp-badges">
                <span className="idp-badge" style={{ background: sStyle.bg, color: sStyle.color }}>{d.status || '—'}</span>
                {d.issuetype && <span className="idp-badge idp-badge-tipo">{d.issuetype}</span>}
                {d.priority && <span className="idp-badge idp-badge-prio">{d.priority}</span>}
              </div>

              {(d.textoHtml || d.texto) && (
                <section>
                  <h3 className="idp-secao">Descrição</h3>
                  {d.textoHtml
                    ? <div className="jira-description idp-desc"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.textoHtml) }} />
                    : <div className="jira-description idp-desc" style={{ whiteSpace: 'pre-wrap' }}>{d.texto}</div>}
                </section>
              )}

              {d.subtasks.length > 0 && (
                <section>
                  <h3 className="idp-secao">Subtarefas ({d.subtasks.length})</h3>
                  <div className="idp-lista">
                    {d.subtasks.map(s => (
                      <div key={s.key} className="idp-subtarefa">
                        <span className="idp-sub-key">{s.key}</span>
                        <span className="idp-sub-sum">{s.summary}</span>
                        <span className="idp-sub-status">{s.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="idp-secao">
                  <MessageSquare size={12} /> Comentários ({d.comments.length})
                </h3>
                {d.comments.length === 0 ? (
                  <p className="idp-vazio-bloco">Nenhum comentário ainda.</p>
                ) : (
                  <div className="idp-lista">
                    {d.comments.map(c => (
                      <div key={c.id} className="idp-comentario">
                        <div className="idp-com-head">
                          {c.authorAvatar
                            ? <img src={c.authorAvatar} alt="" className="idp-avatar" />
                            : <span className="idp-avatar idp-avatar-fallback">{iniciais(c.author)}</span>}
                          <span className="idp-com-autor">{c.author}</span>
                          <span className="idp-com-data">{formatarData(c.created)}</span>
                        </div>
                        {c.bodyHtml
                          ? <div className="jira-description"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }} />
                          : <p className="idp-com-body">{c.body}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Coluna direita: os mesmos campos do painel do Jira ── */}
            <aside className="idp-dir">
              <div className="idp-bloco">
                <h3 className="idp-bloco-titulo">Informações</h3>
                <Campo label="Relator"><Pessoa nome={d.reporter} avatar={d.reporterAvatar} /></Campo>
                <Campo label="PO"><Pessoa nome={d.po} avatar={d.poAvatar} /></Campo>
                <Campo label="Tech Lead"><Pessoa nome={d.techLead} avatar={d.techLeadAvatar} /></Campo>
                <Campo label="Responsável"><Pessoa nome={d.assignee} avatar={d.assigneeAvatar} /></Campo>
                <Campo label="Categorias">
                  {d.labels.length > 0
                    ? <span className="idp-tags">{d.labels.map(l => <span key={l} className="idp-tag">{l}</span>)}</span>
                    : <span className="idp-vazio">Nenhuma</span>}
                </Campo>
                <Campo label="Produto">
                  {d.produto.length > 0
                    ? <span className="idp-tags">{d.produto.map(p => <span key={p.id} className="idp-tag">{p.value}</span>)}</span>
                    : <span className="idp-vazio">Nenhum</span>}
                </Campo>
                <Campo label="Cliente">
                  {d.cliente.length > 0
                    ? <span className="idp-tags">{d.cliente.map(c => <span key={c.id} className="idp-tag">{c.value}</span>)}</span>
                    : <span className="idp-vazio">Nenhum</span>}
                </Campo>
                <Campo label="Saúde do Cliente">
                  {d.saude ? <span className="idp-tag">{d.saude.value}</span> : <span className="idp-vazio">—</span>}
                </Campo>
                <Campo label="Prioridade">{d.priority || <span className="idp-vazio">—</span>}</Campo>
                <Campo label="Impact">
                  {d.impacto ? <span className="idp-tag">{d.impacto.value}</span> : <span className="idp-vazio">—</span>}
                </Campo>
                <Campo label="Data de início">{formatarDia(d.dataInicio)}</Campo>
              </div>

              <div className="idp-bloco">
                <h3 className="idp-bloco-titulo">Mais campos</h3>
                <Campo label="Developer"><Pessoa nome={d.developer} avatar={d.developerAvatar} /></Campo>
                <Campo label="Estimativa original">
                  {d.timeTracking?.originalEstimate || <span className="idp-vazio">0m</span>}
                </Campo>
                <Campo label="Controle de tempo">
                  {temTempo
                    ? `${d.timeTracking?.timeSpent || '0m'} de ${d.timeTracking?.originalEstimate || '0m'}`
                    : <span className="idp-vazio">Nenhum horário registrado</span>}
                </Campo>
                <Campo label="Planned end">{d.plannedEnd ? formatarDia(d.plannedEnd) : <span className="idp-vazio">Nenhum</span>}</Campo>
                <Campo label="Previsão de entrega">{d.duedate ? formatarDia(d.duedate) : <span className="idp-vazio">Nenhuma</span>}</Campo>
              </div>

              <p className="idp-rodape">
                Criado em {formatarData(d.created)}<br />
                Atualizado em {formatarData(d.updated)}
              </p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
