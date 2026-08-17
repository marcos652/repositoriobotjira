'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, WifiOff, RefreshCw, ChevronDown, Info, CalendarRange } from 'lucide-react';
import { Cup } from 'iconsax-react';

interface ItemPeriodo {
  key: string; summary: string; status: string; categoria: string;
  tipo: string; prioridade: string | null; criadoEm: string; atualizadoEm: string;
  novaNoPeriodo: boolean;
}
interface Membro {
  name: string; email: string; avatar: string | null; accountId: string;
  entregou: number; recebeu: number; tocou: number;
  fazendo: number; emAndamento: number; naFila: number;
  itens: ItemPeriodo[];
}
interface Resposta {
  membros: Membro[];
  periodo: { range: string; jqlPeriodo: string; inicio: string | null; fim: string | null };
  totais: {
    entregou: number; recebeu: number; fazendo: number; emAndamento: number;
    issuesNoPeriodo: number; issuesAbertasAgora: number; semResponsavel: number;
  };
  aviso: string;
}

const avatarColors = ['#6366F1', '#EC4899', '#F59E0B', '#06B6D4', '#22C55E', '#8B5CF6', '#EF4444', '#14B8A6'];

const PERIODOS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'custom', label: 'Período personalizado' },
] as const;

const CORES_CATEGORIA: Record<string, string> = {
  done: 'var(--accent-emerald)',
  indeterminate: 'var(--accent-amber)',
  new: 'var(--text-tertiary)',
};

function iniciais(nome: string) {
  return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Data-sem-hora do Jira montada como local: new Date('2026-08-17') seria meia-noite UTC. */
function dataCurta(iso: string) {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [a, m, dia] = d.split('-').map(Number);
  return new Date(a, m - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function EquipePage() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [range, setRange] = useState<string>('30d');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const buscar = useCallback(async (isRefresh = false) => {
    // Período personalizado sem data de início não tem o que consultar — a rota devolveria 400.
    if (range === 'custom' && !inicio) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      let qs = `?range=${range}`;
      if (range === 'custom') {
        qs += `&start=${inicio}`;
        if (fim) qs += `&end=${fim}`;
      }
      const res = await fetch(`/api/jira/team-periodo${qs}`);
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || `HTTP ${res.status}`);
      setDados(j as Resposta);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [range, inicio, fim]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void buscar());
    return () => window.cancelAnimationFrame(frame);
  }, [buscar]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 size={36} className="animate-spin" style={{ color: '#8B5CF6' }} />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Consultando o período no Jira...</p>
    </div>
  );

  if (error || !dados) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-5">
        <WifiOff size={28} style={{ color: '#FB7185' }} />
        <p style={{ color: 'var(--text-primary)' }}>{error || 'Erro ao carregar'}</p>
        <button onClick={() => void buscar()} style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent-violet)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Tentar novamente</button>
      </div>
    </div>
  );

  const { membros, totais } = dados;
  // Ranking pelo que foi entregue NO PERÍODO — antes era o total de todos os tempos, que fazia
  // o pódio nunca mudar.
  const podio = membros.filter(m => m.entregou > 0).slice(0, 3);
  const maxEntregou = Math.max(...membros.map(m => m.entregou), 1);
  const rotuloPeriodo = PERIODOS.find(p => p.id === range)?.label || range;

  return (
    <div className="eq-root">
      <div className="eq-page-header">
        <div className="eq-header-content">
          <div className="eq-header-left">
            <div>
              <h1 className="eq-title">Equipe</h1>
              <p className="eq-subtitle">Projeto DSMM · {rotuloPeriodo.toLowerCase()}</p>
            </div>
          </div>
          <div className="eq-header-actions">
            {/* Um <select> nativo: é o controle "fechado" pedido, e no celular abre o seletor do
                próprio sistema, que é melhor que qualquer menu que eu desenhasse. */}
            <label className="eq-periodo">
              <CalendarRange size={13} aria-hidden="true" />
              <select value={range} onChange={e => { setRange(e.target.value); setExpandido(null); }} aria-label="Período">
                {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>

            {range === 'custom' && (
              <>
                <input className="eq-data" type="date" value={inicio} max={fim || undefined} onChange={e => setInicio(e.target.value)} aria-label="Início" />
                <input className="eq-data" type="date" value={fim} min={inicio || undefined} onChange={e => setFim(e.target.value)} aria-label="Fim" />
              </>
            )}

            <button className="eq-refresh" onClick={() => void buscar(true)} disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
            </button>
            <div className="eq-pill-total">{membros.length} com atividade</div>
          </div>
        </div>

        {range === 'custom' && !inicio && (
          <p className="eq-dica">Escolha a data de início para consultar o período.</p>
        )}
      </div>

      <div className="eq-body">
        <div className="eq-main">
          <div className="eq-grid">
            {membros.map((m, i) => {
              const aberto = expandido === (m.accountId || m.email || m.name);
              const id = m.accountId || m.email || m.name;
              return (
                <div key={id} className="eq-card">
                  <div className="eq-card-top">
                    <div className="eq-avatar-wrap">
                      {m.avatar
                        ? <img src={m.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 8 }} />
                        : <div className="eq-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{iniciais(m.name)}</div>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="eq-name">{m.name}</p>
                      <p className="eq-role">{m.email || '—'}</p>
                    </div>
                  </div>

                  {/* Três números do PERÍODO; o que está em aberto hoje vai na linha de baixo,
                      porque "está fazendo" é presente e não depende da janela escolhida. */}
                  <div className="eq-stats">
                    <div className="eq-stat">
                      <p className="eq-stat-val" style={{ color: 'var(--accent-emerald)' }}>{m.entregou}</p>
                      <p className="eq-stat-label">Entregou</p>
                    </div>
                    <div className="eq-stat">
                      <p className="eq-stat-val" style={{ color: 'var(--accent-blue)' }}>{m.recebeu}</p>
                      <p className="eq-stat-label">Recebeu</p>
                    </div>
                    <div className="eq-stat">
                      <p className="eq-stat-val" style={{ color: 'var(--accent-amber)' }}>{m.tocou}</p>
                      <p className="eq-stat-label">Tocou</p>
                    </div>
                  </div>

                  <p className="eq-agora">
                    Agora: <strong>{m.fazendo}</strong> em aberto
                    {m.emAndamento > 0 && <> · <strong>{m.emAndamento}</strong> em andamento</>}
                    {m.naFila > 0 && <> · <strong>{m.naFila}</strong> na fila</>}
                  </p>

                  <div className="eq-progress-track">
                    <div className="eq-progress-fill" style={{ width: `${(m.entregou / maxEntregou) * 100}%` }} />
                  </div>

                  {m.itens.length > 0 && (
                    <>
                      <button className="eq-toggle" onClick={() => setExpandido(aberto ? null : id)} aria-expanded={aberto}>
                        <ChevronDown size={12} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} aria-hidden="true" />
                        {aberto ? 'Esconder' : `Ver as ${m.itens.length} do período`}
                      </button>

                      {aberto && (
                        <div className="eq-itens">
                          {m.itens.map(it => (
                            <a
                              key={it.key}
                              className="eq-item"
                              href={`https://movingpay.atlassian.net/browse/${it.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="eq-item-key">{it.key}</span>
                              <span className="eq-item-sum">{it.summary}</span>
                              <span className="eq-item-status" style={{ color: CORES_CATEGORIA[it.categoria] || 'var(--text-tertiary)' }}>
                                {it.status}
                              </span>
                              <span className="eq-item-data">{dataCurta(it.atualizadoEm)}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {membros.length === 0 && (
              <div className="eq-vazio">Ninguém movimentou issue do DSMM neste período.</div>
            )}
          </div>
        </div>

        <div className="eq-sidebar">
          <div className="eq-sb-section">
            <h3 className="eq-sb-title"><Cup size={16} variant="Bold" color="#FBBF24" aria-hidden="true" /> Quem mais entregou</h3>
            <div className="eq-top">
              {podio.map((m, i) => (
                <div key={m.name} className="eq-top-item">
                  <div className="eq-top-rank">#{i + 1}</div>
                  {m.avatar
                    ? <img src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                    : <div className="eq-top-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{iniciais(m.name)}</div>}
                  <div className="eq-top-info">
                    <p className="eq-top-name">{m.name}</p>
                    <p className="eq-top-score">{m.entregou} no período</p>
                  </div>
                </div>
              ))}
              {podio.length === 0 && <p className="eq-top-score">Nada concluído no período.</p>}
            </div>
          </div>

          <div className="eq-sb-divider" />

          <div className="eq-sb-section">
            <h3 className="eq-sb-title">No período</h3>
            <div className="eq-summary">
              {[
                { label: 'Entregues', value: totais.entregou, color: 'var(--accent-emerald)' },
                { label: 'Recebidas', value: totais.recebeu, color: 'var(--accent-blue)' },
                { label: 'Issues com movimento', value: totais.issuesNoPeriodo, color: 'var(--text-secondary)' },
              ].map(s => (
                <div key={s.label} className="eq-summary-item">
                  <span className="eq-summary-label">{s.label}</span>
                  <span className="eq-summary-val" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            <h3 className="eq-sb-title" style={{ marginTop: 20 }}>Agora</h3>
            <div className="eq-summary">
              {[
                { label: 'Em aberto', value: totais.issuesAbertasAgora, color: 'var(--accent-blue)' },
                { label: 'Em andamento', value: totais.emAndamento, color: 'var(--accent-amber)' },
                { label: 'Sem responsável', value: totais.semResponsavel, color: 'var(--accent-rose)' },
              ].map(s => (
                <div key={s.label} className="eq-summary-item">
                  <span className="eq-summary-label">{s.label}</span>
                  <span className="eq-summary-val" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* O aviso vem da própria rota: sem ele, "Entregou" seria lido como data de conclusão,
              que é justamente o que o DSMM não registra. */}
          <div className="eq-sb-section eq-aviso">
            <Info size={13} aria-hidden="true" />
            <span>{dados.aviso}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .eq-root{display:flex;flex-direction:column;gap:24px;min-width:0}
        .eq-page-header{flex-shrink:0}
        .eq-header-content{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .eq-header-left{display:flex;align-items:center}
        .eq-title{font-size:32px;line-height:36px;font-weight:500;color:var(--text-primary);letter-spacing:-.02em}.eq-subtitle{font-size:14px;color:var(--text-tertiary);margin-top:6px}
        .eq-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .eq-refresh,.eq-pill-total,.eq-periodo,.eq-data{min-height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-primary);color:var(--text-secondary);font-size:12px;font-weight:600}
        .eq-refresh{cursor:pointer;font-family:inherit;transition:background .15s,color .15s}.eq-refresh:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}.eq-refresh:disabled{opacity:.55;cursor:not-allowed}
        .eq-periodo{padding-right:8px;cursor:pointer}
        .eq-periodo select{border:0;background:transparent;color:var(--text-primary);font:inherit;font-size:12px;font-weight:600;cursor:pointer;outline:none;padding:0 4px}
        .eq-data{font-family:inherit;color-scheme:dark}
        .eq-dica{margin-top:10px;font-size:12px;color:var(--accent-amber)}
        .eq-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.eq-main{min-width:0}
        .eq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .eq-card{padding:20px;border-radius:24px;background:var(--bg-card);border:1px solid var(--border-primary);transition:border-color .15s;min-width:0}
        .eq-card:hover{border-color:var(--border-focus)}
        .eq-card-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .eq-avatar-wrap{position:relative;flex-shrink:0}.eq-avatar{width:42px;height:42px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff}
        .eq-name{font-size:14px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .eq-role{font-size:11px;color:var(--text-tertiary);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .eq-stat{text-align:center;padding:8px;border-radius:8px;background:var(--bg-secondary)}
        .eq-stat-val{font-size:20px;font-weight:500;font-variant-numeric:tabular-nums}
        .eq-stat-label{font-size:9px;font-weight:600;color:var(--text-tertiary);margin-top:2px}
        .eq-agora{margin-top:12px;font-size:11px;color:var(--text-tertiary)}
        .eq-agora strong{color:var(--text-secondary);font-variant-numeric:tabular-nums}
        .eq-progress-track{height:3px;border-radius:2px;background:var(--border-secondary);margin-top:12px;overflow:hidden}
        .eq-progress-fill{height:100%;border-radius:2px;background:var(--accent-violet);transition:width .6s ease}
        .eq-toggle{margin-top:14px;width:100%;min-height:32px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-primary);border-radius:8px;background:transparent;color:var(--text-tertiary);font:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,color .15s}
        .eq-toggle:hover{background:var(--bg-secondary);color:var(--text-primary)}
        .eq-itens{margin-top:10px;display:flex;flex-direction:column;max-height:260px;overflow-y:auto}
        .eq-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:7px 2px;border-bottom:1px solid var(--border-secondary);text-decoration:none}
        .eq-item:last-child{border-bottom:0}
        .eq-item:hover .eq-item-sum{color:var(--text-primary)}
        .eq-item-key{font-size:10px;font-weight:700;color:var(--accent-blue);font-variant-numeric:tabular-nums}
        .eq-item-sum{font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}
        .eq-item-status{font-size:9px;font-weight:700;white-space:nowrap}
        .eq-item-data{font-size:9px;color:var(--text-tertiary);white-space:nowrap;font-variant-numeric:tabular-nums}
        .eq-vazio{padding:40px 20px;text-align:center;font-size:13px;color:var(--text-tertiary);border:1px dashed var(--border-primary);border-radius:24px}
        .eq-sidebar{width:100%;border:1px solid var(--border-primary);border-radius:24px;background:var(--bg-card);overflow:hidden}
        .eq-sb-section{padding:24px}.eq-sb-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:16px}
        .eq-sb-divider{height:1px;margin:0 24px;background:var(--border-secondary)}
        .eq-top{display:flex;flex-direction:column;gap:12px}
        .eq-top-item{display:flex;align-items:center;gap:10px}
        .eq-top-rank{font-size:11px;font-weight:800;color:var(--text-tertiary);width:20px}
        .eq-top-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0}
        .eq-top-name{font-size:12px;font-weight:600;color:var(--text-primary)}.eq-top-score{font-size:10px;color:var(--text-tertiary)}
        .eq-summary{display:flex;flex-direction:column;gap:10px}
        .eq-summary-item{display:flex;justify-content:space-between;align-items:center}
        .eq-summary-label{font-size:11px;color:var(--text-secondary)}
        .eq-summary-val{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
        .eq-aviso{display:flex;align-items:flex-start;gap:8px;padding-top:0;font-size:10px;line-height:15px;color:var(--text-tertiary);border-top:1px solid var(--border-secondary);margin-top:4px;padding-top:16px}
        .eq-aviso svg{flex-shrink:0;margin-top:1px;color:var(--accent-amber)}
        @media (max-width:1100px){.eq-body{grid-template-columns:1fr}.eq-sidebar{display:block}}
        @media (max-width:640px){.eq-header-actions{width:100%}.eq-grid{grid-template-columns:1fr}.eq-title{font-size:28px;line-height:34px}}
      `}</style>
    </div>
  );
}
