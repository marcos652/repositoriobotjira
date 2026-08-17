'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useDragOrder(storageKey: string, defaultIds: string[]) {
  // Começa SEMPRE na ordem padrão — a mesma que o servidor renderiza — e só aplica a ordem
  // salva depois de montar. Ler o localStorage no inicializador do useState fazia o servidor
  // renderizar uma ordem de cards e o cliente outra: hydration mismatch na ORDEM do DOM,
  // que é o pior tipo (o React descarta e regenera a árvore toda).
  const [order, setOrder] = useState<string[]>(defaultIds);

  // defaultIds entra como dependência, e não por ref: os três chamadores passam uma
  // constante de módulo, então a referência é estável e o efeito não re-dispara. (Ler
  // ref.current durante o render é proibido pelas regras de hooks deste projeto.)
  useEffect(() => {
    const padrao = defaultIds;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as string[];
      // Só aceita se a ordem salva cobrir exatamente os cards atuais. Quando um card novo
      // é acrescentado ao código, a ordem antiga não passa por aqui e o padrão prevalece —
      // é assim que o card novo aparece em vez de ficar invisível para quem já arrastou.
      const valida = parsed.length === padrao.length && padrao.every(id => parsed.includes(id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ordem salva no navegador, indisponível no servidor
      if (valida) setOrder(parsed);
    } catch { /* ignore */ }
  }, [storageKey, defaultIds]);

  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const throttleRef = useRef<number>(0);

  const save = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    try { localStorage.setItem(storageKey, JSON.stringify(newOrder)); } catch { /* */ }
  }, [storageKey]);

  const onDragStart = useCallback((id: string) => {
    dragItem.current = id;
    setDraggingId(id);
  }, []);

  // Live reorder — throttled to 60fps for smooth animation
  const onDragEnter = useCallback((id: string) => {
    dragOverItem.current = id;
    setDragOverId(id);

    if (!dragItem.current || dragItem.current === id) return;

    // Throttle to prevent jank
    const now = Date.now();
    if (now - throttleRef.current < 80) return;
    throttleRef.current = now;

    const dragged = dragItem.current;
    setOrder(prev => {
      const from = prev.indexOf(dragged);
      const to = prev.indexOf(id);
      if (from === -1 || to === -1 || from === to) return prev;
      const newOrder = [...prev];
      newOrder.splice(from, 1);
      newOrder.splice(to, 0, dragged);
      return newOrder;
    });
  }, []);

  const onDragEnd = useCallback(() => {
    // Persist the live-reordered state
    setOrder(prev => {
      try { localStorage.setItem(storageKey, JSON.stringify(prev)); } catch { /* */ }
      return prev;
    });
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }, [storageKey]);

  const reset = useCallback(() => save(defaultIds), [defaultIds, save]);

  return { order, draggingId, dragOverId, onDragStart, onDragEnter, onDragEnd, reset };
}
