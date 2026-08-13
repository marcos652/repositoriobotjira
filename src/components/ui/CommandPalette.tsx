'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  navigationSections,
  settingsNavigationItem,
  type NavigationItem,
} from '@/config/navigation';

interface CommandItem extends NavigationItem {
  section: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  ...navigationSections.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.label })),
  ),
  { ...settingsNavigationItem, section: 'Sistema' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => {
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    }, 0);
  }, []);

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedQuery) return COMMAND_ITEMS;

    return COMMAND_ITEMS.filter((item) => {
      const searchable = [item.label, item.section, item.description, ...(item.keywords ?? [])]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return searchable.includes(normalizedQuery);
    });
  }, [query]);

  const groupedItems = useMemo(() => {
    return filtered.reduce<Record<string, CommandItem[]>>((groups, item) => {
      (groups[item.section] ??= []).push(item);
      return groups;
    }, {});
  }, [filtered]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        triggerRef.current = document.activeElement;
        setOpen((current) => !current);
        setQuery('');
        setSelected(0);
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === 'Tab' && open && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && filtered[selected]) {
      event.preventDefault();
      navigate(filtered[selected].href);
    }
  };

  if (!open) return null;

  const resultCount = filtered.length;

  return (
    <div
      className="animate-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(72px, 14vh, 136px) 16px 24px',
        background: 'var(--bg-overlay)',
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby="command-palette-title"
        aria-modal="true"
        className="animate-modal"
        role="dialog"
        style={{
          width: '100%',
          maxWidth: 560,
          overflow: 'hidden',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-surface)',
          background: 'var(--bg-card-solid)',
        }}
      >
        <h2 id="command-palette-title" className="sr-only">Navegação rápida</h2>

        <div
          style={{
            display: 'flex',
            minHeight: 64,
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <Search aria-hidden="true" size={19} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-expanded="true"
            aria-label="Buscar páginas"
            aria-activedescendant={filtered[selected] ? `command-${filtered[selected].href}` : undefined}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas e recursos..."
            role="combobox"
            value={query}
            style={{
              minWidth: 0,
              flex: 1,
              border: 0,
              outline: 0,
              background: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              lineHeight: '24px',
            }}
          />
          <kbd
            style={{
              flexShrink: 0,
              padding: '3px 7px',
              border: '1px solid var(--border-primary)',
              borderRadius: 6,
              background: 'var(--bg-input)',
              color: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          >
            Esc
          </kbd>
        </div>

        <div
          id="command-palette-results"
          role="listbox"
          aria-label={`${resultCount} páginas encontradas`}
          style={{ maxHeight: 'min(52vh, 440px)', overflowY: 'auto', padding: '10px' }}
        >
          {resultCount === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500 }}>
                Nenhum resultado encontrado
              </p>
              <p style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: 13 }}>
                Tente outro termo para localizar uma página.
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} role="group" aria-label={section} style={{ paddingBottom: 6 }}>
                <p
                  style={{
                    padding: '8px 10px 5px',
                    color: 'var(--text-tertiary)',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '20px',
                  }}
                >
                  {section}
                </p>
                {items.map((item) => {
                  const itemIndex = filtered.indexOf(item);
                  const isSelected = itemIndex === selected;
                  const Icon = item.icon;

                  return (
                    <button
                      id={`command-${item.href}`}
                      key={item.href}
                      aria-selected={isSelected}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelected(itemIndex)}
                      role="option"
                      type="button"
                      style={{
                        display: 'flex',
                        width: '100%',
                        minHeight: 48,
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        border: 0,
                        borderRadius: 'var(--radius-control)',
                        background: isSelected ? 'var(--accent-blue-light)' : 'transparent',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'grid',
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          placeItems: 'center',
                          border: '1px solid var(--border-secondary)',
                          borderRadius: 8,
                          background: 'var(--bg-secondary)',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        }}
                      >
                        <Icon size={17} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>
                          {item.label}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            color: 'var(--text-tertiary)',
                            fontSize: 12,
                            lineHeight: '18px',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.description}
                        </span>
                      </span>
                      {isSelected && <ArrowRight aria-hidden="true" size={16} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 20px',
            borderTop: '1px solid var(--border-primary)',
            color: 'var(--text-tertiary)',
            fontSize: 11,
            lineHeight: '18px',
          }}
        >
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Command aria-hidden="true" size={12} /> K
          </span>
        </footer>
      </section>
    </div>
  );
}
