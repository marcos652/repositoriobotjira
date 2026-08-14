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
      {/* Co-branding: JiraOps (o produto) | Movingpay (a empresa), mesmo par do
          login. Agrupados num container só para o gap de 24px da navbar não se
          repetir entre a marca, o divisor e o co-brand. */}
      <div className="dashboard-navbar__brands">
        <Link href="/dashboard" className="dashboard-brand" aria-label="JiraOps — ir para o overview">
          <span className="dashboard-brand__mark" aria-hidden="true"><Zap size={18} /></span>
          <span className="dashboard-brand__name">JiraOps</span>
        </Link>

        <span aria-hidden="true" className="dashboard-navbar__divider" />

        {/* Nova aba de propósito: é um app externo, e navegar na mesma aba
            descartaria trabalho em andamento aqui (uma demanda sendo escrita, por
            exemplo). rel="noopener noreferrer" impede que a página aberta acesse
            este window pelo window.opener. */}
        <a
          className="dashboard-navbar__cobrand"
          href="https://console.movingpay.com.br/login"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Console Movingpay — abre em nova aba"
          title="Abrir o Console Movingpay"
        >
          {/* aria-hidden: o "M" é decorativo — com o nome escrito ao lado, um leitor
              de tela anunciaria "M Movingpay". */}
          <span className="dashboard-navbar__mp-mark" aria-hidden="true">
            <span className="dashboard-navbar__mp-glyph">M</span>
          </span>
          <span className="dashboard-navbar__cobrand-name">Movingpay</span>
        </a>
      </div>

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

      {/* Os estilos da navbar viajam COM o componente, via styled-jsx, em vez de
          morarem no globals.css. Motivo concreto: em producao apareceu HTML/JS novo
          servido junto de um globals.css defasado — a navbar renderizava sem nenhuma
          das suas regras, empilhada na lateral. Assim isso deixa de ser possivel: se
          o componente renderiza, o CSS dele veio no mesmo chunk. */}
      <style jsx global>{`
/* Repetido de proposito: .dashboard-shell e declarado no globals.css. Se aquele
   arquivo estiver defasado, o shell volta a ser row e a navbar vai para a lateral. */
.dashboard-shell {
  flex-direction: column;
}
/* ============================================
   NAVBAR — navegação principal na horizontal
   ============================================ */

.dashboard-navbar {
  position: relative;
  z-index: 50; /* acima da topbar (30), senão os menus abrem por baixo dela */
  flex: 0 0 56px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-card-solid);
}

.dashboard-navbar__brands {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.dashboard-navbar__divider {
  flex: 0 0 auto;
  width: 1px;
  height: 24px;
  background: var(--border-primary);
}

/* Virou link para o Console Movingpay: o lockup inteiro (badge + nome) é a área
   clicável, que é o padrão de assinatura de marca e dá um alvo bem maior que só
   as letras. */
.dashboard-navbar__cobrand {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: var(--radius-control);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.dashboard-navbar__cobrand:hover {
  opacity: 0.82;
}

.dashboard-navbar__cobrand:hover .dashboard-navbar__cobrand-name {
  color: var(--text-primary);
}

/* O foco fica no lockup todo — sem isto o contorno sairia colado nas letras e o
   badge, que faz parte do mesmo link, ficaria de fora. */
.dashboard-navbar__cobrand:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 3px;
}

/* Navy fixo nos DOIS temas, e não um token: isto é marca, não elemento de UI.
   No tema claro (--bg-secondary #F1F5F9) o degradê verde/azul cairia para ~2:1
   de contraste — invisível. Sobre este navy fica 8:1 no verde e 5,8:1 no azul. */
.dashboard-navbar__mp-mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: #001147;
}

/* Degradê recortado no próprio glifo. Três paradas em vez de duas porque num
   glifo de 18px um degradê de dois pontos vira quase uma cor média — puxando o
   verde para 28% ele ocupa a diagonal superior-esquerda de forma perceptível.
   WebkitTextFillColor junto do color: só o color falha em algumas versões do
   Safari, deixando a letra invisível. */
.dashboard-navbar__mp-glyph {
  background-image: linear-gradient(135deg, #34D399 0%, #22C55E 28%, #4C93F5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}

.dashboard-navbar__cobrand-name {
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* flex:1 com max-width: ocupa o vão entre a marca e os grupos, mas sem virar uma
   faixa de 900px em monitor ultrawide. */
.dashboard-navbar__search {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 440px;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-control);
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.dashboard-navbar__search:hover,
.dashboard-navbar__search:focus-visible {
  border-color: var(--border-focus);
  color: var(--text-secondary);
}

.dashboard-navbar__search svg {
  flex: 0 0 16px;
}

.dashboard-navbar__search > span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-navbar__search kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--border-primary);
  border-radius: 5px;
  background: var(--bg-card-solid);
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: 11px;
  line-height: 16px;
}

/* O container ocupa a faixa que resta (flex:1), mas os itens ficam JUNTOS e
   centrados nela. space-between empurrava cada um para uma extremidade e abria vãos
   de ~60px — a barra ficava preenchida e os grupos, soltos. Centralizado com gap
   fixo, o conjunto lê como um bloco e ainda fica equilibrado na barra. */
.dashboard-navbar__groups {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dashboard-navgroup {
  position: relative;
}

/* flex:0 0 auto para o gatilho nunca encolher: o rótulo é nowrap, então largura
   menor que o conteúdo faria o texto vazar da caixa. Quando a barra aperta, quem
   cede é a busca (tem min-width:0), não os nomes dos grupos. */
.dashboard-navgroup__trigger {
  flex: 0 0 auto;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.dashboard-navgroup__trigger:hover,
.dashboard-navgroup__trigger.is-open {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Mesmo tratamento de ativo da sidebar: com os itens escondidos nos menus, é isto
   que responde "em qual área eu estou". */
.dashboard-navgroup__trigger.is-active {
  background: var(--accent-blue-light);
  border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent);
  color: var(--accent-blue);
}

.dashboard-navgroup__trigger svg {
  transition: transform var(--transition-fast);
}

.dashboard-navgroup__trigger.is-open svg {
  transform: rotate(180deg);
}

.dashboard-navgroup__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1;
  min-width: 228px;
  display: none;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-card, 12px);
  background: var(--bg-card-solid);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
}

.dashboard-navgroup__menu.is-open {
  display: flex;
}

/* Compartilhado com o menu de perfil da topbar — um item de menu é a mesma coisa
   nos dois lugares, e duplicar o estilo faria os dois divergirem com o tempo. */
.dashboard-navgroup__item {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.dashboard-navgroup__item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.dashboard-navgroup__item.is-active {
  background: var(--accent-blue-light);
  border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent);
  color: var(--accent-blue);
}

.dashboard-navgroup__item svg {
  flex: 0 0 16px;
}

/* Especificidade de DUAS classes de propósito. O botão também é .dashboard-icon-button,
   que declara 'display: inline-grid' mais adiante no arquivo — com uma classe só, a
   regra posterior vencia e o hambúrguer aparecia em qualquer largura. Pior: o
   'margin-left: auto' dele então engolia todo o espaço livre, criando um vão morto
   entre a busca e os grupos. Duas classes vencem independente da ordem no arquivo. */
.dashboard-navbar .dashboard-navbar__toggle {
  display: none;
  margin-left: auto;
}

/* Abaixo de 1024px os 5 grupos não caem lado a lado junto da marca, então viram
   um painel sob a navbar. */
@media (max-width: 1023px) {
  /* Precisa das mesmas duas classes: a regra base agora tem essa especificidade, e
     um seletor de uma classe aqui perderia mesmo estando dentro de @media. */
  .dashboard-navbar .dashboard-navbar__toggle {
    display: inline-grid;
  }

  .dashboard-navbar__groups {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    display: none;
    flex-direction: column;
    align-items: stretch;
    /* No painel a direção é coluna: o space-between do desktop espalharia os grupos
       verticalmente, deixando vãos enormes entre eles. */
    justify-content: flex-start;
    gap: 4px;
    max-height: calc(100dvh - 56px);
    overflow-y: auto;
    padding: 12px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-card-solid);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
  }

  .dashboard-navbar__groups.is-mobile-open {
    display: flex;
  }

  /* Dentro do painel cada grupo já lista seus itens — o trigger passa a ser só um
     rótulo de seção. Um segundo nível de toque para abrir/fechar em tela pequena
     dobra o esforço sem ganho nenhum. */
  .dashboard-navgroup__trigger {
    width: 100%;
    padding: 10px 10px 4px;
    color: var(--text-tertiary);
    font-size: 12px;
    pointer-events: none;
  }

  .dashboard-navgroup__trigger.is-active {
    border-color: transparent;
    background: none;
  }

  .dashboard-navgroup__trigger svg {
    display: none;
  }

  .dashboard-navgroup__menu,
  .dashboard-navgroup__menu.is-open {
    position: static;
    min-width: 0;
    display: flex;
    padding: 0;
    border: none;
    background: none;
    box-shadow: none;
  }
}

/* Espaço fica disputado antes do painel mobile: some o NOME da Movingpay e fica
   só o monograma, que já identifica a empresa sem custar largura. */
@media (max-width: 1023px) {
  .dashboard-navbar__cobrand-name {
    display: none;
  }
}

/* Em telefone não há teclado físico: a dica do atalho só rouba largura do campo.
   E o co-branding inteiro sai, para a busca ter espaço utilizável. */
@media (max-width: 639px) {
  .dashboard-navbar__search kbd {
    display: none;
  }

  .dashboard-navbar__divider,
  .dashboard-navbar__cobrand {
    display: none;
  }

  .dashboard-navbar {
    gap: 12px;
    padding: 0 12px;
  }
}
      `}</style>
    </nav>
  );
}
