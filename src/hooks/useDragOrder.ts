'use client';

import { useState, useCallback, useRef } from 'react';

export function useDragOrder(storageKey: string, defaultIds: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultIds;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = defaultIds.every(id => parsed.includes(id)) && parsed.length === defaultIds.length;
        if (valid) return parsed;
      }
    } catch { /* ignore */ }
    return defaultIds;
  });

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
