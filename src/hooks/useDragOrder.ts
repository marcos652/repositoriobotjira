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

  const save = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    try { localStorage.setItem(storageKey, JSON.stringify(newOrder)); } catch { /* */ }
  }, [storageKey]);

  const onDragStart = useCallback((id: string) => {
    dragItem.current = id;
    setDraggingId(id);
  }, []);

  const onDragEnter = useCallback((id: string) => {
    dragOverItem.current = id;
    setDragOverId(id);
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragItem.current && dragOverItem.current && dragItem.current !== dragOverItem.current) {
      const newOrder = [...order];
      const from = newOrder.indexOf(dragItem.current);
      const to = newOrder.indexOf(dragOverItem.current);
      if (from !== -1 && to !== -1) {
        newOrder.splice(from, 1);
        newOrder.splice(to, 0, dragItem.current);
        save(newOrder);
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }, [order, save]);

  const reset = useCallback(() => save(defaultIds), [defaultIds, save]);

  return { order, draggingId, dragOverId, onDragStart, onDragEnter, onDragEnd, reset };
}
