'use client';

import React from 'react';
import { ArrowRight, Clock, Pause, Play, Zap } from 'lucide-react';

const automations = [
  { name: 'Auto-assign por componente', trigger: 'Issue criada', action: 'Atribuir ao responsável', status: 'active', runs: 245, lastRun: '2min atrás', color: '#22C55E' },
  { name: 'Notificar SLA crítico', trigger: 'SLA < 2h', action: 'Enviar alerta Slack', status: 'active', runs: 89, lastRun: '15min atrás', color: '#F43F5E' },
  { name: 'Fechar tickets inativos', trigger: 'Sem resposta 7d', action: 'Mover para Fechado', status: 'active', runs: 156, lastRun: '1h atrás', color: '#3B82F6' },
  { name: 'Sprint auto-complete', trigger: 'Sprint finalizada', action: 'Gerar relatório', status: 'paused', runs: 12, lastRun: '3d atrás', color: '#F59E0B' },
  { name: 'Deploy notification', trigger: 'Release criada', action: 'Postar no canal #releases', status: 'active', runs: 34, lastRun: '5h atrás', color: '#8B5CF6' },
];

export default function AutomacoesPage() {
  const activeCount = automations.filter((automation) => automation.status === 'active').length;
  const pausedCount = automations.filter((automation) => automation.status === 'paused').length;
  const runCount = automations.reduce((sum, automation) => sum + automation.runs, 0);

  return (
    <div className="at-root">
      <header className="at-header">
        <div className="at-heading">
          <div className="at-kicker"><Zap size={15} /> Workflows</div>
          <h1>Automações</h1>
          <p>Regras e workflows automatizados</p>
        </div>
        <div className="at-header-actions" aria-label="Resumo de automações">
          <span className="at-chip at-chip-active"><Play size={13} /> {activeCount} ativas</span>
          <span className="at-chip">{runCount} execuções</span>
        </div>
      </header>

      <div className="at-layout">
        <section className="at-surface at-workflows" aria-labelledby="at-workflows-title">
          <div className="at-surface-header">
            <div>
              <h2 id="at-workflows-title">Workflows configurados</h2>
              <p>Acompanhe gatilhos, ações e a última execução.</p>
            </div>
            <span className="at-count">{automations.length} regras</span>
          </div>

          <div className="at-table-head" aria-hidden="true">
            <span>Regra e fluxo</span>
            <span>Execuções</span>
            <span>Última execução</span>
            <span>Status</span>
          </div>

          <div className="at-list">
            {automations.map((automation) => (
              <article key={automation.name} className="at-row">
                <div className="at-rule">
                  <div className="at-rule-icon" style={{ background: `${automation.color}12`, color: automation.color }}>
                    <Zap size={16} />
                  </div>
                  <div className="at-rule-copy">
                    <h3>{automation.name}</h3>
                    <div className="at-flow">
                      <span>{automation.trigger}</span>
                      <ArrowRight size={12} />
                      <span>{automation.action}</span>
                    </div>
                  </div>
                </div>
                <div className="at-cell" data-label="Execuções">{automation.runs} runs</div>
                <div className="at-cell at-last-run" data-label="Última execução"><Clock size={13} /> {automation.lastRun}</div>
                <div className="at-cell" data-label="Status">
                  <span className={`at-status ${automation.status}`}>
                    {automation.status === 'active' ? <><Play size={11} />Ativa</> : <><Pause size={11} />Pausada</>}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="at-surface at-summary" aria-labelledby="at-summary-title">
          <div className="at-surface-header at-summary-header">
            <div>
              <h2 id="at-summary-title">Resumo</h2>
              <p>Visão geral das regras.</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Ativas</dt>
              <dd style={{ color: 'var(--accent-emerald)' }}>{activeCount}</dd>
            </div>
            <div>
              <dt>Pausadas</dt>
              <dd style={{ color: 'var(--accent-amber)' }}>{pausedCount}</dd>
            </div>
            <div>
              <dt>Total execuções</dt>
              <dd style={{ color: 'var(--accent-blue)' }}>{runCount}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <style jsx>{`
        .at-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .at-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .at-heading { min-width: 0; }
        .at-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #F59E0B;
          font-size: 12px;
          font-weight: 700;
        }
        .at-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .at-heading p,
        .at-surface-header p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .at-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .at-chip,
        .at-count {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 36px;
          padding: 8px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .at-chip-active {
          border-color: rgba(34, 197, 94, 0.15);
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .at-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          align-items: start;
          gap: 24px;
        }
        .at-surface {
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .at-surface-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .at-surface-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .at-count {
          min-height: 32px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          font-size: 11px;
        }
        .at-table-head,
        .at-row {
          display: grid;
          grid-template-columns: minmax(300px, 1fr) 92px 132px 92px;
          column-gap: 18px;
          align-items: center;
        }
        .at-table-head {
          min-height: 42px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border-secondary);
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .at-row {
          min-height: 76px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .at-row:last-child { border-bottom: 0; }
        .at-row:hover { background: var(--bg-card-hover); }
        .at-rule {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .at-rule-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .at-rule-copy { min-width: 0; }
        .at-rule-copy h3 {
          margin: 0;
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 650;
          line-height: 19px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .at-flow {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          margin-top: 3px;
          color: var(--text-tertiary);
          font-size: 10px;
          line-height: 16px;
        }
        .at-flow span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .at-flow :global(svg) { flex: 0 0 auto; }
        .at-cell {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
        }
        .at-last-run {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .at-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
        }
        .at-status.active {
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .at-status.paused {
          background: var(--accent-amber-light);
          color: var(--accent-amber);
        }
        .at-summary-header { border-bottom: 0; }
        .at-summary dl { margin: 0; padding: 0 24px 14px; }
        .at-summary dl div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid var(--border-secondary);
        }
        .at-summary dt {
          color: var(--text-secondary);
          font-size: 12px;
        }
        .at-summary dd {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          line-height: 24px;
        }
        @media (max-width: 1100px) {
          .at-layout { grid-template-columns: minmax(0, 1fr); }
          .at-summary dl {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
          .at-summary dl div { border-top: 1px solid var(--border-secondary); }
        }
        @media (max-width: 760px) {
          .at-header { align-items: flex-start; flex-direction: column; }
          .at-header-actions { justify-content: flex-start; }
          .at-table-head { display: none; }
          .at-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px 16px;
            padding: 18px 20px;
          }
          .at-rule { grid-column: 1 / -1; }
          .at-cell::before {
            display: block;
            margin-bottom: 4px;
            color: var(--text-tertiary);
            content: attr(data-label);
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .at-last-run { display: block; }
          .at-last-run :global(svg) { display: none; }
          .at-summary dl { grid-template-columns: 1fr; gap: 0; }
        }
        @media (max-width: 520px) {
          .at-heading h1 { font-size: 28px; line-height: 34px; }
          .at-surface-header { align-items: flex-start; padding: 20px; }
          .at-count { display: none; }
          .at-flow { align-items: flex-start; flex-direction: column; gap: 1px; }
          .at-flow :global(svg) { display: none; }
        }
      `}</style>
    </div>
  );
}
