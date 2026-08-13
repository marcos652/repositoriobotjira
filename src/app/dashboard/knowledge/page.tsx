'use client';

import React from 'react';
import { BookOpen, Clock, Eye, FileText } from 'lucide-react';

const articles = [
  { title: 'Como configurar webhooks no Jira', category: 'Integração', date: '25/05', views: 142, color: '#6366F1' },
  { title: 'Guia de priorização de backlog', category: 'Processo', date: '22/05', views: 98, color: '#22C55E' },
  { title: 'Troubleshooting: erros de API REST', category: 'Debug', date: '20/05', views: 234, color: '#F43F5E' },
  { title: 'Workflow de code review', category: 'Engenharia', date: '18/05', views: 76, color: '#3B82F6' },
  { title: 'SLA: como definir métricas', category: 'Suporte', date: '15/05', views: 189, color: '#F59E0B' },
  { title: 'Deploy contínuo com GitHub Actions', category: 'DevOps', date: '12/05', views: 312, color: '#8B5CF6' },
];

const categories = ['Integração', 'Processo', 'Debug', 'Engenharia', 'Suporte', 'DevOps'];

export default function KnowledgePage() {
  const popularArticles = [...articles].sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <div className="kb-root">
      <header className="kb-header">
        <div className="kb-heading">
          <div className="kb-kicker"><BookOpen size={15} /> Documentação</div>
          <h1>Base de Conhecimento</h1>
          <p>Documentação e artigos internos</p>
        </div>
        <span className="kb-chip">{articles.length} artigos</span>
      </header>

      <div className="kb-layout">
        <section className="kb-surface kb-library" aria-labelledby="kb-library-title">
          <div className="kb-surface-header">
            <div>
              <h2 id="kb-library-title">Biblioteca de artigos</h2>
              <p>Conteúdos recentes para consulta rápida do time.</p>
            </div>
            <span className="kb-count">Atualizada em 25/05</span>
          </div>

          <div className="kb-table-head" aria-hidden="true">
            <span>Artigo</span>
            <span>Categoria</span>
            <span>Atualizado</span>
            <span>Leituras</span>
          </div>

          <div className="kb-list">
            {articles.map((article) => (
              <article key={article.title} className="kb-row">
                <div className="kb-article">
                  <div className="kb-article-icon" style={{ background: `${article.color}12`, color: article.color }}>
                    <FileText size={16} />
                  </div>
                  <h3>{article.title}</h3>
                </div>
                <div className="kb-cell" data-label="Categoria">
                  <span className="kb-tag" style={{ background: `${article.color}12`, color: article.color }}>{article.category}</span>
                </div>
                <div className="kb-cell kb-date" data-label="Atualizado"><Clock size={13} /> {article.date}</div>
                <div className="kb-cell kb-views" data-label="Leituras"><Eye size={13} /> {article.views}</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="kb-surface kb-sidebar" aria-label="Navegação da base de conhecimento">
          <section className="kb-side-section" aria-labelledby="kb-categories-title">
            <div className="kb-side-heading">
              <h2 id="kb-categories-title">Categorias</h2>
              <p>Explore por assunto.</p>
            </div>
            <div className="kb-categories">
              {categories.map((category) => <div key={category} className="kb-category">{category}</div>)}
            </div>
          </section>

          <section className="kb-side-section kb-popular-section" aria-labelledby="kb-popular-title">
            <div className="kb-side-heading">
              <h2 id="kb-popular-title">Mais lidos</h2>
              <p>Artigos mais consultados.</p>
            </div>
            <ol className="kb-popular-list">
              {popularArticles.map((article, index) => (
                <li key={article.title} className="kb-popular">
                  <span className="kb-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="kb-popular-title">{article.title}</span>
                  <span className="kb-popular-views">{article.views}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <style jsx>{`
        .kb-root {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
        }
        .kb-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 4px 0;
        }
        .kb-heading { min-width: 0; }
        .kb-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #EC4899;
          font-size: 12px;
          font-weight: 700;
        }
        .kb-heading h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 32px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.03em;
        }
        .kb-heading p,
        .kb-surface-header p,
        .kb-side-heading p {
          margin: 6px 0 0;
          color: var(--text-tertiary);
          font-size: 13px;
          line-height: 20px;
        }
        .kb-chip,
        .kb-count {
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
        .kb-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          align-items: start;
          gap: 24px;
        }
        .kb-surface {
          overflow: hidden;
          border: 1px solid var(--border-primary);
          border-radius: 24px;
          background: var(--bg-card);
        }
        .kb-surface-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-secondary);
        }
        .kb-surface-header h2,
        .kb-side-heading h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
        }
        .kb-count {
          min-height: 32px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 11px;
        }
        .kb-table-head,
        .kb-row {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 110px 92px 70px;
          column-gap: 18px;
          align-items: center;
        }
        .kb-table-head {
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
        .kb-row {
          min-height: 72px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border-secondary);
          cursor: pointer;
        }
        .kb-row:last-child { border-bottom: 0; }
        .kb-row:hover { background: var(--bg-card-hover); }
        .kb-article {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .kb-article-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .kb-article h3 {
          margin: 0;
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 650;
          line-height: 19px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kb-cell {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
        }
        .kb-tag {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
        }
        .kb-date,
        .kb-views {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .kb-side-section { padding: 22px 24px 24px; }
        .kb-popular-section { border-top: 1px solid var(--border-secondary); }
        .kb-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }
        .kb-category {
          padding: 7px 10px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }
        .kb-category:hover {
          border-color: #EC4899;
          color: #EC4899;
        }
        .kb-popular-list {
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }
        .kb-popular {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 11px 0;
          border-top: 1px solid var(--border-secondary);
        }
        .kb-rank {
          color: #EC4899;
          font-size: 10px;
          font-weight: 700;
        }
        .kb-popular-title {
          overflow: hidden;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 16px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kb-popular-views {
          color: var(--text-tertiary);
          font-size: 10px;
          font-weight: 700;
        }
        @media (max-width: 1080px) {
          .kb-layout { grid-template-columns: minmax(0, 1fr); }
          .kb-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .kb-popular-section {
            border-top: 0;
            border-left: 1px solid var(--border-secondary);
          }
        }
        @media (max-width: 720px) {
          .kb-header { align-items: flex-start; flex-direction: column; }
          .kb-table-head { display: none; }
          .kb-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            padding: 18px 20px;
          }
          .kb-article { grid-column: 1 / -1; }
          .kb-cell::before {
            display: block;
            margin-bottom: 5px;
            color: var(--text-tertiary);
            content: attr(data-label);
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .kb-date,
          .kb-views { display: block; }
          .kb-date :global(svg),
          .kb-views :global(svg) { display: none; }
          .kb-sidebar { grid-template-columns: 1fr; }
          .kb-popular-section {
            border-top: 1px solid var(--border-secondary);
            border-left: 0;
          }
        }
        @media (max-width: 520px) {
          .kb-heading h1 { font-size: 28px; line-height: 34px; }
          .kb-surface-header { align-items: flex-start; padding: 20px; }
          .kb-count { display: none; }
          .kb-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .kb-views { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}
