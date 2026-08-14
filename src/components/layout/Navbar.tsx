'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Search, X, Zap } from 'lucide-react';
import { navigationSections } from '@/config/navigation';

/**
 * Navegação principal na horizontal, no topo — substitui a sidebar.
 *
 * Os 24 itens não cabem lado a lado (passariam de 2900px), então cada um dos 5
 * grupos vira um menu. Abre por CLIQUE, não hover: hover não existe em toque e
 * deixa o menu inalcançável por teclado.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  // A paleta escuta Ctrl/Cmd+K no document; despachar o atalho é como os outros
  // pontos de entrada (topbar, antiga sidebar) já a abriam.
  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  // Um grupo aparece ativo quando a rota atual é de algum item dele — é o que
  // diz "você está aqui" agora que os itens não estão todos visíveis.
  const groupHasActive = (items: { href: string }[]) => items.some((item) => isActive(item.href));

  // Trocar de rota fecha o que estiver aberto: sem isso o menu fica pairando sobre
  // a página nova depois de clicar num item. Reage ao pathname (e não ao onClick do
  // Link) para cobrir também voltar/avançar do navegador e a paleta de comandos,
  // que navegam sem passar por um clique aqui.
  /* eslint-disable react-hooks/set-state-in-effect -- a rota é entrada externa espelhada no estado de abertura dos menus */
  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!openGroup && !mobileOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenGroup(null);
      setMobileOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openGroup, mobileOpen]);

  return (
    <nav ref={navRef} className="dashboard-navbar" aria-label="Navegação principal">
      <Link href="/dashboard" className="dashboard-brand" aria-label="JiraOps — ir para o overview">
        <span className="dashboard-brand__mark" aria-hidden="true"><Zap size={18} /></span>
        <span className="dashboard-brand__name">JiraOps</span>
      </Link>

      {/* Abre a paleta de comandos em vez de ser um campo próprio: ela já é a busca
          global (páginas e recursos, com navegação por teclado). Dois campos de
          busca na mesma tela competiriam entre si e dobrariam a manutenção. */}
      <button
        type="button"
        className="dashboard-navbar__search"
        onClick={openCommandPalette}
        aria-label="Buscar páginas e recursos"
      >
        <Search size={16} aria-hidden="true" />
        <span>Buscar páginas e recursos...</span>
        <kbd>Ctrl K</kbd>
      </button>

      <button
        type="button"
        className="dashboard-icon-button dashboard-navbar__toggle"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`dashboard-navbar__groups ${mobileOpen ? 'is-mobile-open' : ''}`}>
        {navigationSections.map((section) => {
          const open = openGroup === section.label;
          return (
            <div key={section.label} className="dashboard-navgroup">
              <button
                type="button"
                className={`dashboard-navgroup__trigger ${open ? 'is-open' : ''} ${groupHasActive(section.items) ? 'is-active' : ''}`}
                onClick={() => setOpenGroup(open ? null : section.label)}
                aria-expanded={open}
                aria-haspopup="true"
              >
                <span>{section.label}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {/* No mobile a lista fica sempre aberta dentro do painel: menu
                  dentro de menu em tela pequena é ruim de acertar com o dedo. */}
              <div className={`dashboard-navgroup__menu ${open ? 'is-open' : ''}`} role="menu" aria-label={section.label}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      aria-current={active ? 'page' : undefined}
                      className={`dashboard-navgroup__item ${active ? 'is-active' : ''}`}
                    >
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.href === '/dashboard/notificacoes' && (
                        <span className="dashboard-nav-item__badge">3</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
