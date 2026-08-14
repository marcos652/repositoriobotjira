'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { settingsNavigationItem } from '@/config/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : email.slice(0, 2)).toUpperCase();
}

function getDisplayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export default function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [userEmail, setUserEmail] = useState('');
  const [userImage, setUserImage] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [authMethod, setAuthMethod] = useState<'google' | 'slack' | ''>('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/custom-session')
      .then((response) => response.json())
      .then((data) => {
        if (!data.user?.email) return;
        setUserEmail(data.user.email);
        setUserImage(data.user.image || '');
        setUserRole(data.user.role || 'user');
        setAuthMethod(data.user.image ? 'google' : 'slack');
      })
      .catch(() => {});
  }, []);

  // Mesma razão da navbar: a rota é entrada externa espelhada no estado de abertura.
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o menu ao navegar, inclusive por voltar/avançar */
  useEffect(() => setProfileOpen(false), [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);

  // Herdado do pé da sidebar: quem entrou pelo Google precisa encerrar TAMBÉM a
  // sessão do Auth.js, senão o proxy reconhece o SSO e reabre o 2º fator em loop.
  const handleLogout = async () => {
    if (authMethod === 'google') {
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
      });
    }
    await fetch('/api/custom-session', { method: 'DELETE' });
    router.push('/login');
  };

  const SettingsIcon = settingsNavigationItem.icon;

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__breadcrumb">
        <nav aria-label="Navegação estrutural">
          <Link href="/dashboard">JiraOps</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        {subtitle && <span className="dashboard-topbar__context">{subtitle}</span>}
      </div>

      {/* O ícone de busca saiu daqui: a navbar agora tem a barra de pesquisa, e as
          duas abriam a MESMA paleta de comandos — dois gatilhos idênticos na mesma
          tela só ocupam espaço e fazem o usuário se perguntar se são coisas
          diferentes. O atalho Ctrl+K continua funcionando de qualquer lugar. */}
      <div className="dashboard-topbar__actions">
        <Link className="dashboard-icon-button" href="/dashboard/notificacoes" aria-label="Notificações">
          <Bell size={18} />
          <span className="dashboard-topbar__notification-dot" />
        </Link>
        <button type="button" className="dashboard-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* O perfil virou menu porque Configurações e Sair moraram no pé da
            sidebar até agora — sem isso não haveria como sair da aplicação. */}
        <div className="dashboard-topbar__profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="dashboard-topbar__profile"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Conta e preferências"
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" />
            ) : (
              <span aria-hidden="true">{userEmail ? getInitials(userEmail) : 'JO'}</span>
            )}
            <strong>{userEmail ? getDisplayName(userEmail) : 'JiraOps'}</strong>
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {profileOpen && (
            <div className="dashboard-topbar__profile-menu" role="menu">
              <div className="dashboard-topbar__profile-id">
                <strong>{userEmail ? getDisplayName(userEmail) : 'JiraOps'}</strong>
                <small>{userEmail ? (userRole === 'admin' ? 'Administrador' : 'Usuário') : 'Validando sessão'}</small>
              </div>
              <Link
                href={settingsNavigationItem.href}
                role="menuitem"
                className={`dashboard-navgroup__item ${pathname.startsWith(settingsNavigationItem.href) ? 'is-active' : ''}`}
              >
                <SettingsIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>{settingsNavigationItem.label}</span>
              </Link>
              <button type="button" role="menuitem" className="dashboard-navgroup__item" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
