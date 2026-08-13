'use client';

import React from 'react';
import { CheckCircle2, Plug, XCircle } from 'lucide-react';
import { Messages2, Code, Book, Danger, Chart2, ColorSwatch, Calendar, ShieldCross } from 'iconsax-react';

// `color` tinge o ícone e o fundo do card, então usa tons legíveis no tema escuro
// em vez do hex exato da marca (o #24292F do GitHub, por exemplo, desaparecia).
const integrations = [
  { name: 'Slack', desc: 'Notificações e alertas em canais', status: 'connected', Icon: Messages2, color: '#E85D82' },
  { name: 'GitHub', desc: 'Sincronizar PRs e commits', status: 'connected', Icon: Code, color: '#A9B1BA' },
  { name: 'Confluence', desc: 'Documentação e wikis', status: 'connected', Icon: Book, color: '#4C93F5' },
  { name: 'PagerDuty', desc: 'Gestão de incidentes', status: 'disconnected', Icon: Danger, color: '#22C55E' },
  { name: 'Datadog', desc: 'Monitoramento e métricas', status: 'connected', Icon: Chart2, color: '#A78BFA' },
  { name: 'Figma', desc: 'Designs e protótipos', status: 'disconnected', Icon: ColorSwatch, color: '#F97B54' },
  { name: 'Google Calendar', desc: 'Sincronizar eventos', status: 'connected', Icon: Calendar, color: '#5C9CFF' },
  { name: 'Sentry', desc: 'Rastreamento de erros', status: 'connected', Icon: ShieldCross, color: '#9C8FE0' },
];

export default function IntegracoesPage() {
  const connectedCount = integrations.filter((integration) => integration.status === 'connected').length;
  const disconnectedCount = integrations.filter((integration) => integration.status === 'disconnected').length;

  return (
    <div className="ig-root">
      <header className="ig-header">
        <div className="ig-heading">
          <div className="ig-kicker"><Plug size={15} /> Ecossistema</div>
          <h1>Integrações</h1>
          <p>Conexões e APIs externas</p>
        </div>
        <div className="ig-header-actions" aria-label="Resumo das integrações">
          <span className="ig-chip ig-chip-connected"><CheckCircle2 size={13} /> {connectedCount} conectadas</span>
          <span className="ig-chip">{integrations.length} total</span>
        </div>
      </header>

      <div className="ig-layout">
        <main className="ig-catalog">
          <div className="ig-catalog-header">
            <div>
              <h2>Catálogo de integrações</h2>
              <p>Gerencie as ferramentas conectadas ao seu workspace.</p>
            </div>
            <span>{integrations.length} serviços</span>
          </div>

          <div className="ig-grid">
            {integrations.map((integration) => (
              <article key={integration.name} className="ig-card">
                <div className="ig-card-header">
                  <span
                    className="ig-card-icon"
                    style={{ background: `${integration.color}14`, borderColor: `${integration.color}2E` }}
                    aria-hidden="true"
                  >
                    <integration.Icon size={22} color={integration.color} variant="Bold" />
                  </span>
                  <span className={`ig-status ${integration.status}`}>
                    {integration.status === 'connected'
                      ? <><CheckCircle2 size={12} />Conectado</>
                      : <><XCircle size={12} />Desconectado</>}
                  </span>
                </div>
                <div className="ig-card-copy">
                  <h3>{integration.name}</h3>
                  <p>{integration.desc}</p>
                </div>
                <div className="ig-card-footer">
                  <span>{integration.status === 'connected' ? 'Integração ativa' : 'Integração disponível'}</span>
                  <button className="ig-button">{integration.status === 'connected' ? 'Configurar' : 'Conectar'}</button>
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="ig-summary" aria-labelledby="ig-summary-title">
          <div className="ig-summary-header">
            <h2 id="ig-summary-title">Status</h2>
            <p>Visão geral das conexões.</p>
          </div>
          <dl>
            <div>
              <dt><span className="ig-dot connected" />Conectadas</dt>
              <dd style={{ color: 'var(--accent-emerald)' }}>{connectedCount}</dd>
            </div>
            <div>
              <dt><span className="ig-dot disconnected" />Desconectadas</dt>
              <dd style={{ color: 'var(--accent-rose)' }}>{disconnectedCount}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <style jsx>{`
        .ig-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .ig-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .ig-heading { min-width: 0; }
        .ig-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #06B6D4;
          font-size: 12px;
          font-weight: 700;
        }
        .ig-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .ig-heading p,
        .ig-catalog-header p,
        .ig-summary-header p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .ig-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ig-chip {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ig-chip-connected {
          border-color: rgba(34, 197, 94, 0.15);
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .ig-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          align-items: start;
          gap: 24px;
        }
        .ig-catalog { min-width: 0; }
        .ig-catalog-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          padding: 0 4px;
        }
        .ig-catalog-header h2,
        .ig-summary-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .ig-catalog-header > span {
          color: var(--text-tertiary);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .ig-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .ig-card,
        .ig-summary {
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .ig-card {
          display: flex;
          min-width: 0;
          min-height: 210px;
          flex-direction: column;
          padding: 20px;
        }
        .ig-card:hover { border-color: var(--border-secondary); }
        .ig-card-header,
        .ig-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ig-card-icon {
          display: flex;
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 8px;
        }
        .ig-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
        }
        .ig-status.connected {
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
        }
        .ig-status.disconnected {
          background: var(--accent-rose-light);
          color: var(--accent-rose);
        }
        .ig-card-copy { flex: 1; padding: 18px 0; }
        .ig-card-copy h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 650;
          line-height: 22px;
        }
        .ig-card-copy p {
          margin: 5px 0 0;
          color: var(--text-tertiary);
          font-size: 12px;
          line-height: 18px;
        }
        .ig-card-footer {
          padding-top: 14px;
          border-top: 1px solid var(--border-secondary);
        }
        .ig-card-footer > span {
          overflow: hidden;
          color: var(--text-tertiary);
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ig-button {
          min-height: 34px;
          padding: 7px 12px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 650;
        }
        .ig-button:hover {
          border-color: #06B6D4;
          color: #06B6D4;
        }
        .ig-summary { overflow: hidden; }
        .ig-summary-header {
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .ig-summary dl { margin: 0; padding: 0 24px 14px; }
        .ig-summary dl div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-secondary);
        }
        .ig-summary dl div:last-child { border-bottom: 0; }
        .ig-summary dt {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 12px;
        }
        .ig-summary dd {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          line-height: 24px;
        }
        .ig-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
        }
        .ig-dot.connected { background: var(--accent-emerald); }
        .ig-dot.disconnected { background: var(--accent-rose); }
        @media (max-width: 1120px) {
          .ig-layout { grid-template-columns: minmax(0, 1fr); }
          .ig-summary dl {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }
          .ig-summary dl div { border-bottom: 0; }
        }
        @media (max-width: 760px) {
          .ig-header { align-items: flex-start; flex-direction: column; }
          .ig-header-actions { justify-content: flex-start; }
          .ig-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .ig-heading h1 { font-size: 28px; line-height: 34px; }
          .ig-catalog-header { align-items: flex-start; flex-direction: column; }
          .ig-card { min-height: 198px; }
          .ig-summary dl { grid-template-columns: 1fr; gap: 0; }
          .ig-summary dl div { border-bottom: 1px solid var(--border-secondary); }
        }
      `}</style>
    </div>
  );
}
