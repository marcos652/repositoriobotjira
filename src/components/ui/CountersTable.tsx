'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Database, AlertTriangle } from 'lucide-react';

// Tabela de contadores no Overview.
//
// Busca sozinha, em /api/metrics/counters, e NÃO espera pelas métricas do resto da tela:
// essa rota só lê o Redis (milissegundos), enquanto support/dev recalculam a partir do
// Jira. É por isso que a tabela aparece preenchida enquanto o resto ainda carrega — era o
// objetivo de existir.

interface Linha {
  id: string;
  nome: string;
  tipo: 'suporte' | 'desenvolvimento' | 'jiraops';
  valor: number;
  vazio: boolean;
}

interface Resposta {
  linhas: Linha[];
  atualizadoEm: string | null;
  idadeMs: number | null;
  origem: 'redis' | 'indisponivel';
}

const TITULO_TIPO: Record<Linha['tipo'], string> = {
  suporte: 'Suporte',
  desenvolvimento: 'Desenvolvimento',
  jiraops: 'JiraOps',
};

function idade(ms: number | null): string {
  if (ms === null) return 'nunca';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min atrás`;
  return `${Math.round(m / 60)}h atrás`;
}

export default function CountersTable({ index = 0 }: { index?: number }) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recontando, setRecontando] = useState(false);

  const buscar = useCallback(async (forcar = false) => {
    try {
      if (forcar) setRecontando(true);
      const res = await fetch(`/api/metrics/counters${forcar ? '?forcar=1' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDados(await res.json());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
      setRecontando(false);
    }
  }, []);

  // Busca no próximo frame, e não no corpo do efeito — mesmo padrão do DashboardOverview.
  // Adia o setState para fora da renderização, que é o que a regra set-state-in-effect pede.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void buscar());
    return () => window.cancelAnimationFrame(frame);
  }, [buscar]);

  const tipos: Linha['tipo'][] = ['suporte', 'desenvolvimento', 'jiraops'];

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-surface)', animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between gap-4 p-7 pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)' }}>
            <Database size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl leading-8 font-medium truncate" style={{ color: 'var(--text-primary)' }}>Estatísticas</h3>
            <p className="text-[13px] leading-5 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {dados ? `Recontado ${idade(dados.idadeMs)}` : 'Carregando...'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void buscar(true)}
          disabled={recontando}
          title="Recontar agora no Jira"
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
        >
          {recontando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center p-7">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : erro ? (
        <div className="flex-1 flex items-center gap-2.5 p-7 text-sm" style={{ color: 'var(--accent-rose)' }}>
          <AlertTriangle size={16} /> <span>{erro}</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-7 pb-7">
          {/* Redis ausente significa tabela sem lugar para existir — melhor dizer isso do
              que mostrar uma coluna de zeros que parece dado real. */}
          {dados?.origem === 'indisponivel' && (
            <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--accent-amber-light)', color: 'var(--text-secondary)' }}>
              Redis não configurado — os contadores não têm onde ser guardados.
            </p>
          )}

          {tipos.map(tipo => {
            const linhas = dados?.linhas.filter(l => l.tipo === tipo) ?? [];
            if (linhas.length === 0) return null;
            return (
              <div key={tipo} className="mb-5 last:mb-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {TITULO_TIPO[tipo]}
                </p>
                <div className="flex flex-col">
                  {linhas.map(l => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border-primary)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{l.nome}</p>
                        <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{l.id}</p>
                      </div>
                      {/* "—" e não "0" quando a linha nunca foi medida: zero é um número, e
                          mostrar zero afirmaria algo que não sabemos. */}
                      <p className="text-xl font-extrabold tabular-nums flex-shrink-0" style={{ color: l.vazio ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                        {l.vazio ? '—' : l.valor.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
