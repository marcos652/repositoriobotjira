'use client';

/* eslint-disable @next/next/no-img-element -- Os avatares do Jira usam hosts remotos dinâmicos. */

import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, AtSign, Bell, Check, CheckCircle2, ExternalLink, Loader2, MessageCircle, RefreshCw, Send, UserPlus, WifiOff } from 'lucide-react';

interface Notification {
  id?: string;
  type: string;
  issueKey: string;
  summary: string;
  author: string;
  authorAvatar: string | null;
  date: string;
  message: string;
  /** Para quem a notificação é dirigida (menção/atribuição). */
  destinatario?: string;
  /** true quando o destinatário é quem está logado. */
  paraMim?: boolean;
  /** Trecho do comentário, para não precisar abrir o Jira. */
  trecho?: string;
}

interface Identidade {
  email: string | null;
  accountId: string | null;
  reconhecido: boolean;
}

/**
 * Uma linha por id. Guarda contra id repetido chegando do servidor: sem isso o React
 * reclama de chave duplicada e o MESMO aviso aparece duas vezes na tela — e, pior, dispensar
 * um dos dois deixaria a cópia orfa na lista, ja que a acao e por id.
 *
 * A causa raiz (mencao repetida no mesmo comentario) foi consertada na rota; isto e cinto de
 * seguranca, porque a lista vem de fora e pode ficar velha em cache.
 */
function porId(lista: Notification[]): Notification[] {
  const vistos = new Set<string>();
  return lista.filter((n) => {
    const chave = n.id || `${n.issueKey}-${n.date}-${n.type}-${n.author}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  mention: { icon: AtSign, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  assigned: { icon: UserPlus, color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  comment: { icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  status: { icon: ArrowRight, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
};

// /api/notifications, e não /api/jira/team: é a rota que resolve o accountId de quem está
// logado e marca cada item com paraMim, além de detectar @menção e atribuição.
async function requestNotifications() {
  const response = await fetch('/api/notifications');
  if (!response.ok) {
    const corpo = await response.json().catch(() => ({}));
    throw new Error(corpo.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    notifications: (data.notifications || []) as Notification[],
    identidade: (data.identidade || { email: null, accountId: null, reconhecido: false }) as Identidade,
    janelaDias: (data.janelaDias || 14) as number,
  };
}

function NotificationState({ mode, onRetry }: { mode: 'loading' | 'error'; onRetry?: () => void }) {
  const isLoading = mode === 'loading';

  return (
    <div className="nt-state-page">
      <div className="nt-state-card">
        <div className={`nt-state-icon ${mode}`}>
          {isLoading ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
        </div>
        <h1>{isLoading ? 'Notificações' : 'Erro'}</h1>
        <p>{isLoading ? 'Carregando notificações...' : 'Não foi possível carregar as notificações.'}</p>
        {!isLoading && <button onClick={onRetry}>Tentar novamente</button>}
      </div>

      <style jsx>{`
        .nt-state-page {
          display: flex;
          min-height: 60vh;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .nt-state-card {
          display: flex;
          width: min(100%, 420px);
          align-items: center;
          flex-direction: column;
          padding: 40px 24px;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
          text-align: center;
        }
        .nt-state-icon {
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-rose-light);
        }
        .nt-state-icon.loading { color: #F43F5E; }
        .nt-state-icon.error { color: #FB7185; }
        .nt-state-card h1 {
          margin: 18px 0 0;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 500;
          line-height: 30px;
        }
        .nt-state-card p {
          margin: 7px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
        }
        .nt-state-card button {
          min-height: 36px;
          margin-top: 20px;
          padding: 8px 14px;
          border: 1px solid #F43F5E;
          border-radius: 8px;
          background: #F43F5E;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
        }
      `}</style>
    </div>
  );
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('paraMim');
  const [identidade, setIdentidade] = useState<Identidade | null>(null);
  const [janelaDias, setJanelaDias] = useState(14);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState<string | null>(null);
  // Guarda o id junto do aviso para oferecer o desfazer: some da lista sem volta seria uma
  // armadilha, porque não há como reencontrar o item depois.
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'erro'; idDesfazer?: string } | null>(null);

  async function fetchData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await requestNotifications();
      setNotifications(porId(data.notifications));
      setIdentidade(data.identidade);
      setJanelaDias(data.janelaDias);
      setError(null);
    } catch (fetchError) {
      setError(String(fetchError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Some da lista na hora em que a API confirma. Otimista NÃO: se o Jira recusar o
  // comentário, o item tem que continuar aí — esconder uma cobrança não respondida é pior
  // do que um clique que não fez nada.
  async function agir(n: Notification, corpo: Record<string, unknown>, sucesso: string) {
    setEnviando(n.id || n.issueKey);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id, issueKey: n.issueKey, ...corpo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAviso({ texto: data.error || `Falha (HTTP ${res.status})`, tipo: 'erro' });
        return;
      }
      setNotifications((atual) => atual.filter((x) => x.id !== n.id));
      setRespondendo(null);
      setTexto('');
      setAviso({ texto: data.aviso || sucesso, tipo: data.aviso ? 'erro' : 'ok', idDesfazer: n.id });
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'Erro de conexão', tipo: 'erro' });
    } finally {
      setEnviando(null);
    }
  }

  async function desfazer(id: string) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, restaurar: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAviso(null);
      // Recarrega em vez de reinserir na memória: o item precisa voltar na posição certa por
      // data, e a lista já vem ordenada do servidor.
      await fetchData(true);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'Falha ao desfazer', tipo: 'erro' });
    }
  }

  // Um único caminho de busca (fetchData), e não uma segunda cópia da mesma lógica aqui:
  // duas rotinas gravando a mesma lista era manutenção dobrada e uma chance a mais de as
  // duas respostas se atropelarem. requestAnimationFrame adia o setState para fora da
  // renderização, como nas outras telas do painel.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void fetchData());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // "paraMim" não é um tipo, é um recorte: reúne menções e atribuições dirigidas a você.
  const filtered = notifications.filter((n) =>
    filterType === 'all' ? true : filterType === 'paraMim' ? n.paraMim === true : n.type === filterType
  );
  const conta = (tipo: string) => notifications.filter((n) => n.type === tipo).length;
  const paraMimCount = notifications.filter((n) => n.paraMim === true).length;

  if (loading) {
    return <NotificationState mode="loading" />;
  }

  if (error) {
    return <NotificationState mode="error" onRetry={() => void fetchData()} />;
  }

  const tabs = [
    { id: 'paraMim', label: `Para mim (${paraMimCount})` },
    { id: 'mention', label: `Menções (${conta('mention')})` },
    { id: 'assigned', label: `Atribuições (${conta('assigned')})` },
    { id: 'comment', label: `Comentários (${conta('comment')})` },
    { id: 'status', label: `Status (${conta('status')})` },
    { id: 'all', label: `Todas (${notifications.length})` },
  ];

  return (
    <div className="nt-root">
      <header className="nt-header">
        <div className="nt-heading">
          <div className="nt-kicker"><Bell size={15} /> Central de atividades</div>
          <h1>Notificações</h1>
          <p>{notifications.length} atividades nos últimos {janelaDias} dias · {paraMimCount} para você</p>
        </div>
        <button className="nt-refresh" onClick={() => void fetchData(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      {/* Sem accountId, nada pode ser marcado como seu, e a aba "Para mim" ficaria vazia
          parecendo defeito. Dizer o motivo é melhor que uma lista vazia silenciosa. */}
      {identidade && !identidade.reconhecido && (
        <div className="nt-aviso">
          <AtSign size={14} />
          <span>
            {identidade.email
              ? <>Não encontrei uma conta ativa no Jira para <strong>{identidade.email}</strong>, então não é possível saber o que é dirigido a você. As menções e atribuições das outras pessoas continuam listadas.</>
              : <>Sessão sem e-mail reconhecido — não é possível separar o que é dirigido a você.</>}
          </span>
        </div>
      )}

      <nav className="nt-tabs" aria-label="Filtrar notificações">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={filterType === tab.id ? 'active' : ''}
            onClick={() => setFilterType(tab.id)}
            aria-pressed={filterType === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {aviso && (
        <div className={`nt-feedback ${aviso.tipo}`} role="status">
          <span>{aviso.texto}</span>
          <div className="nt-feedback-acoes">
            {aviso.idDesfazer && (
              <button onClick={() => void desfazer(aviso.idDesfazer!)}>Desfazer</button>
            )}
            <button onClick={() => setAviso(null)} aria-label="Fechar aviso">Fechar</button>
          </div>
        </div>
      )}

      <section className="nt-surface" aria-labelledby="nt-activity-title">
        <div className="nt-surface-header">
          <div>
            <h2 id="nt-activity-title">Atividades</h2>
            <p>Atualizações recentes dos seus projetos no Jira.</p>
          </div>
          <span>{filtered.length} resultados</span>
        </div>

        {filtered.length === 0 ? (
          <div className="nt-empty">
            <div className="nt-empty-icon"><CheckCircle2 size={22} /></div>
            <h3>Nenhuma notificação</h3>
            <p>Não há atividades para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="nt-list">
            {filtered.map((notification, index) => {
              const config = typeConfig[notification.type] || typeConfig.status;
              const Icon = config.icon;

              return (
                <article
                  key={notification.id || `${notification.issueKey}-${notification.date}-${notification.type}-${index}`}
                  className={`nt-row ${notification.paraMim ? 'nt-row-mine' : ''}`}
                >
                  <div className="nt-type-icon" style={{ background: config.bg, color: config.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="nt-content">
                    <div className="nt-author-row">
                      <div className="nt-author">
                        {notification.authorAvatar
                          ? <img src={notification.authorAvatar} alt="" />
                          : <span className="nt-avatar-placeholder" aria-hidden="true">{notification.author.slice(0, 1).toUpperCase()}</span>}
                        <strong>{notification.author}</strong>
                      </div>
                      <time dateTime={notification.date}>{timeAgo(notification.date)}</time>
                    </div>
                    <p className="nt-message">
                      {notification.message}
                      {notification.paraMim && <span className="nt-badge-mine">para você</span>}
                    </p>
                    {/* O trecho existe para a pessoa decidir se precisa abrir o Jira. */}
                    {notification.trecho && <p className="nt-trecho">{notification.trecho}</p>}
                    <div className="nt-issue-row">
                      <a href={`https://movingpay.atlassian.net/browse/${notification.issueKey}`} target="_blank" rel="noopener noreferrer">
                        {notification.issueKey} <ExternalLink size={10} />
                      </a>
                      {notification.summary && <span>{notification.summary}</span>}
                    </div>

                    {respondendo === notification.id ? (
                      <div className="nt-responder">
                        <textarea
                          value={texto}
                          onChange={(e) => setTexto(e.target.value)}
                          placeholder={`Responder em ${notification.issueKey}...`}
                          rows={3}
                          autoFocus
                          maxLength={5000}
                          onKeyDown={(e) => {
                            // Ctrl/Cmd+Enter envia; Enter sozinho quebra linha, porque
                            // comentário de uma linha é a exceção, não a regra.
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && texto.trim()) {
                              void agir(notification, { comentario: texto }, `Comentário publicado em ${notification.issueKey}`);
                            }
                            if (e.key === 'Escape') { setRespondendo(null); setTexto(''); }
                          }}
                        />
                        <div className="nt-responder-rodape">
                          <span className="nt-responder-dica">Ctrl+Enter envia · Esc cancela</span>
                          <div className="nt-responder-botoes">
                            <button
                              className="nt-btn-ghost"
                              onClick={() => { setRespondendo(null); setTexto(''); }}
                            >
                              Cancelar
                            </button>
                            <button
                              className="nt-btn-primary"
                              disabled={!texto.trim() || enviando === notification.id}
                              onClick={() => void agir(notification, { comentario: texto }, `Comentário publicado em ${notification.issueKey}`)}
                            >
                              {enviando === notification.id
                                ? <><Loader2 size={12} className="animate-spin" /> Enviando</>
                                : <><Send size={12} /> Comentar e resolver</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="nt-acoes">
                        <button
                          className="nt-btn-ghost"
                          onClick={() => { setRespondendo(notification.id || null); setTexto(''); setAviso(null); }}
                        >
                          <MessageCircle size={12} /> Responder
                        </button>
                        <button
                          className="nt-btn-ghost"
                          disabled={enviando === notification.id}
                          onClick={() => void agir(notification, { apenasDispensar: true }, 'Notificação dispensada')}
                        >
                          {enviando === notification.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Check size={12} />} Já vi
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .nt-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .nt-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .nt-heading { min-width: 0; }
        .nt-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #F43F5E;
          font-size: 12px;
          font-weight: 700;
        }
        .nt-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .nt-heading p,
        .nt-surface-header p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .nt-refresh,
        .nt-tabs button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
        }
        .nt-refresh:hover,
        .nt-tabs button:hover { background: var(--bg-card-hover); }
        .nt-refresh:disabled { cursor: wait; opacity: 0.65; }
        .nt-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 0 4px 2px;
        }
        .nt-tabs button { white-space: nowrap; }
        .nt-tabs button.active {
          border-color: rgba(244, 63, 94, 0.15);
          background: var(--accent-rose-light);
          color: #F43F5E;
        }
        .nt-surface {
          flex: 1;
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .nt-surface-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .nt-surface-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .nt-surface-header > span {
          min-height: 32px;
          padding: 7px 10px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .nt-row {
          display: flex;
          gap: 14px;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .nt-row:last-child { border-bottom: 0; }
        .nt-row:hover { background: var(--bg-card-hover); }
        /* Barra na lateral, e não fundo colorido: na aba "Para mim" TODAS as linhas são
           suas, e um fundo colorido em tudo viraria ruído em vez de destaque. */
        .nt-row-mine { border-left: 3px solid #F59E0B; padding-left: 21px; }
        .nt-badge-mine {
          margin-left: 8px;
          padding: 2px 7px;
          border: 1px solid rgba(245,158,11,0.28);
          border-radius: 999px;
          background: rgba(245,158,11,0.12);
          color: #F59E0B;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .nt-trecho {
          margin: 0 0 8px;
          padding: 8px 11px;
          border-left: 2px solid var(--border-primary);
          border-radius: 0 8px 8px 0;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 12px;
          line-height: 18px;
        }
        .nt-aviso {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 14px;
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 8px;
          background: rgba(245,158,11,0.09);
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 18px;
        }
        .nt-aviso svg { flex: 0 0 auto; margin-top: 1px; color: #F59E0B; }
        .nt-aviso strong { color: var(--text-primary); }

        .nt-feedback {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .nt-feedback.ok {
          border: 1px solid var(--accent-emerald-light);
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .nt-feedback.erro {
          border: 1px solid var(--accent-rose-light);
          background: var(--accent-rose-light);
          color: var(--accent-rose);
        }
        .nt-feedback-acoes { display: flex; flex: 0 0 auto; gap: 7px; }
        .nt-feedback-acoes button {
          padding: 4px 10px;
          border: 1px solid currentColor;
          border-radius: 6px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
        }

        .nt-acoes { display: flex; gap: 8px; margin-top: 10px; }
        .nt-btn-ghost, .nt-btn-primary {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          gap: 6px;
          padding: 0 11px;
          border-radius: 7px;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 650;
          transition: background .15s, color .15s, border-color .15s;
        }
        .nt-btn-ghost {
          border: 1px solid var(--border-primary);
          background: transparent;
          color: var(--text-tertiary);
        }
        .nt-btn-ghost:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
        .nt-btn-primary {
          border: 1px solid var(--accent-blue);
          background: var(--accent-blue);
          color: #fff;
        }
        .nt-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
        .nt-btn-ghost:disabled, .nt-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .nt-responder { margin-top: 10px; }
        .nt-responder textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font: inherit;
          font-size: 12px;
          line-height: 18px;
          resize: vertical;
        }
        .nt-responder textarea:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
        .nt-responder-rodape {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .nt-responder-dica { color: var(--text-tertiary); font-size: 11px; }
        .nt-responder-botoes { display: flex; gap: 7px; }
        .nt-type-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .nt-content { min-width: 0; flex: 1; }
        .nt-author-row,
        .nt-author,
        .nt-issue-row {
          display: flex;
          align-items: center;
        }
        .nt-author-row { justify-content: space-between; gap: 12px; }
        .nt-author { min-width: 0; gap: 8px; }
        .nt-author img,
        .nt-avatar-placeholder {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          border-radius: 6px;
        }
        .nt-author img { object-fit: cover; }
        .nt-avatar-placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 10px;
          font-weight: 700;
        }
        .nt-author strong {
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nt-author-row time {
          flex: 0 0 auto;
          color: var(--text-tertiary);
          font-size: 10px;
          font-variant-numeric: tabular-nums;
        }
        .nt-message {
          margin: 7px 0 8px;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 18px;
        }
        .nt-issue-row { min-width: 0; gap: 8px; }
        .nt-issue-row a {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.08);
          color: #818CF8;
          font-size: 10px;
          font-weight: 700;
          text-decoration: none;
        }
        .nt-issue-row a:hover { text-decoration: underline; }
        .nt-issue-row > span {
          overflow: hidden;
          color: var(--text-tertiary);
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nt-empty {
          display: flex;
          min-height: 300px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 48px 20px;
          text-align: center;
        }
        .nt-empty-icon {
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .nt-empty h3 {
          margin: 14px 0 0;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 650;
        }
        .nt-empty p {
          margin: 5px 0 0;
          color: var(--text-tertiary);
          font-size: 12px;
        }
        @media (max-width: 640px) {
          .nt-header { align-items: flex-start; flex-direction: column; }
          .nt-heading h1 { font-size: 28px; line-height: 34px; }
          .nt-surface-header { align-items: flex-start; padding: 20px; }
          .nt-surface-header > span { display: none; }
          .nt-row { padding: 18px 20px; }
          .nt-author-row { align-items: flex-start; flex-direction: column; gap: 5px; }
          .nt-author-row time { padding-left: 30px; }
          .nt-issue-row { align-items: flex-start; flex-direction: column; }
          .nt-issue-row > span { width: 100%; }
        }
      `}</style>
    </div>
  );
}
