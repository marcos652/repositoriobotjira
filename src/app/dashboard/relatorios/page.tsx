'use client';

import React from 'react';
import { BarChart3, Clock, Download, Eye, FileBarChart, FileText, PieChart, TrendingUp } from 'lucide-react';

const reports = [
  { name: 'Relatório Mensal de SLA', type: 'SLA', date: '28/05/2026', status: 'ready', icon: PieChart, color: '#6366F1' },
  { name: 'Performance do Time - Maio', type: 'Performance', date: '27/05/2026', status: 'ready', icon: TrendingUp, color: '#22C55E' },
  { name: 'Análise de Bugs Q2', type: 'Qualidade', date: '25/05/2026', status: 'ready', icon: BarChart3, color: '#F43F5E' },
  { name: 'Throughput Semanal', type: 'Produtividade', date: '26/05/2026', status: 'generating', icon: FileBarChart, color: '#F59E0B' },
  { name: 'Relatório de Sprint 12', type: 'Sprint', date: '20/05/2026', status: 'ready', icon: FileText, color: '#3B82F6' },
  { name: 'Análise de Incidentes', type: 'Incidentes', date: '18/05/2026', status: 'ready', icon: BarChart3, color: '#8B5CF6' },
];

const reportTypes = ['SLA', 'Performance', 'Qualidade', 'Sprint', 'Incidentes'];

export default function RelatoriosPage() {
  const readyCount = reports.filter((report) => report.status === 'ready').length;

  return (
    <div className="rel-root">
      <header className="rel-header">
        <div className="rel-heading">
          <div className="rel-kicker"><FileBarChart size={15} /> Dados e análises</div>
          <h1>Relatórios</h1>
          <p>Reports e exportações de dados</p>
        </div>
        <span className="rel-chip">{readyCount} disponíveis</span>
      </header>

      <div className="rel-layout">
        <section className="rel-surface rel-reports" aria-labelledby="rel-reports-title">
          <div className="rel-surface-header">
            <div>
              <h2 id="rel-reports-title">Relatórios recentes</h2>
              <p>Visualize ou exporte os documentos gerados.</p>
            </div>
            <span className="rel-count">{reports.length} arquivos</span>
          </div>

          <div className="rel-table-head" aria-hidden="true">
            <span>Relatório</span>
            <span>Tipo</span>
            <span>Atualizado</span>
            <span>Ações</span>
          </div>

          <div className="rel-list">
            {reports.map((report) => {
              const Icon = report.icon;

              return (
                <article key={report.name} className="rel-row">
                  <div className="rel-report">
                    <div className="rel-report-icon" style={{ background: `${report.color}12`, color: report.color }}>
                      <Icon size={17} />
                    </div>
                    <h3>{report.name}</h3>
                  </div>
                  <div className="rel-cell" data-label="Tipo"><span className="rel-type">{report.type}</span></div>
                  <div className="rel-cell rel-date" data-label="Atualizado"><Clock size={13} /> {report.date}</div>
                  <div className="rel-cell rel-actions" data-label="Ações">
                    {report.status === 'ready' ? (
                      <>
                        <button className="rel-button"><Eye size={14} /> Visualizar</button>
                        <button className="rel-button rel-button-primary"><Download size={14} /> PDF</button>
                      </>
                    ) : (
                      <span className="rel-generating">⏳ Gerando...</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rel-surface rel-sidebar" aria-label="Opções de relatórios">
          <section className="rel-side-section" aria-labelledby="rel-types-title">
            <div className="rel-side-heading">
              <h2 id="rel-types-title">Tipos</h2>
              <p>Navegue por categoria.</p>
            </div>
            <div className="rel-types">
              {reportTypes.map((type) => <div key={type} className="rel-type-option">{type}</div>)}
            </div>
          </section>
          <section className="rel-side-section rel-export" aria-labelledby="rel-export-title">
            <div className="rel-export-icon"><Download size={17} /></div>
            <div className="rel-side-heading">
              <h2 id="rel-export-title">Exportação rápida</h2>
              <p>Selecione um relatório e exporte em PDF, CSV ou JSON.</p>
            </div>
          </section>
        </aside>
      </div>

      <style jsx>{`
        .rel-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .rel-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .rel-heading { min-width: 0; }
        .rel-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #3B82F6;
          font-size: 12px;
          font-weight: 700;
        }
        .rel-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .rel-heading p,
        .rel-surface-header p,
        .rel-side-heading p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .rel-chip,
        .rel-count {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          padding: 8px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .rel-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          align-items: start;
          gap: 24px;
        }
        .rel-surface {
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .rel-surface-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .rel-surface-header h2,
        .rel-side-heading h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .rel-count {
          min-height: 32px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 11px;
        }
        .rel-table-head,
        .rel-row {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) 104px 104px 194px;
          column-gap: 16px;
          align-items: center;
        }
        .rel-table-head {
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
        .rel-row {
          min-height: 76px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .rel-row:last-child { border-bottom: 0; }
        .rel-row:hover { background: var(--bg-card-hover); }
        .rel-report {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .rel-report-icon {
          display: flex;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .rel-report h3 {
          margin: 0;
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 650;
          line-height: 19px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rel-cell {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
        }
        .rel-type {
          display: inline-flex;
          padding: 5px 8px;
          border: 1px solid var(--border-secondary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 700;
        }
        .rel-date {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .rel-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .rel-button {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 10px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 650;
        }
        .rel-button:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .rel-button-primary {
          border-color: var(--accent-blue);
          background: var(--accent-blue);
          color: #fff;
        }
        .rel-button-primary:hover { color: #fff; opacity: 0.9; }
        .rel-generating { color: var(--text-tertiary); font-size: 11px; }
        .rel-side-section { padding: 22px 24px 24px; }
        .rel-export {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border-top: 1px solid var(--border-secondary);
        }
        .rel-export-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-blue-light);
          color: var(--accent-blue);
        }
        .rel-types {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }
        .rel-type-option {
          padding: 7px 10px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }
        .rel-type-option:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        @media (max-width: 1140px) {
          .rel-layout { grid-template-columns: minmax(0, 1fr); }
          .rel-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .rel-export { border-top: 0; border-left: 1px solid var(--border-secondary); }
        }
        @media (max-width: 820px) {
          .rel-header { align-items: flex-start; flex-direction: column; }
          .rel-table-head { display: none; }
          .rel-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px 16px;
            padding: 18px 20px;
          }
          .rel-report { grid-column: 1 / -1; }
          .rel-cell::before {
            display: block;
            margin-bottom: 5px;
            color: var(--text-tertiary);
            content: attr(data-label);
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .rel-date { display: block; }
          .rel-date :global(svg) { display: none; }
          .rel-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
          .rel-sidebar { grid-template-columns: 1fr; }
          .rel-export { border-top: 1px solid var(--border-secondary); border-left: 0; }
        }
        @media (max-width: 520px) {
          .rel-heading h1 { font-size: 28px; line-height: 34px; }
          .rel-surface-header { align-items: flex-start; padding: 20px; }
          .rel-count { display: none; }
        }
      `}</style>
    </div>
  );
}
