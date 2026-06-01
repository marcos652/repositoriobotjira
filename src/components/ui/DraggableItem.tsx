'use client';

import React, { useState, useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableItemProps {
  id: string;
  editMode: boolean;
  label: string;
  draggingId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  currentSize?: number;
  minSize?: number;
  maxSize?: number;
  onResizeDirect?: (newSize: number) => void;
}

export default function DraggableItem({
  id, editMode, draggingId, dragOverId, onDragStart, onDragEnter, onDragEnd, label, children,
  className = '', style = {}, currentSize, minSize = 15, maxSize = 100, onResizeDirect
}: DraggableItemProps) {
  const [canDrag, setCanDrag] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDragging = draggingId === id;
  const isDragOver = dragOverId === id && draggingId !== null && draggingId !== id;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startSize = currentSize || 33.33;
    const element = containerRef.current;
    if (!element) return;

    const parentWidth = element.parentElement?.getBoundingClientRect().width || window.innerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Use rAF for smooth 60fps updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / parentWidth) * 100;
        const targetSize = Math.round(startSize + deltaPercent);
        const clampedSize = Math.max(minSize, Math.min(maxSize, targetSize));
        if (onResizeDirect) onResizeDirect(clampedSize);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  }, [currentSize, minSize, maxSize, onResizeDirect]);

  return (
    <div
      ref={containerRef}
      draggable={editMode && canDrag}
      onDragStart={() => onDragStart(id)}
      onDragEnter={() => onDragEnter(id)}
      onDragEnd={() => {
        onDragEnd();
        setCanDrag(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      className={`relative ${className}`}
      style={{
        opacity: isDragging ? 0.4 : 1,
        // No transition during resize for instant feedback; smooth transition otherwise
        transition: isResizing ? 'opacity 0.2s' : 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isDragOver && editMode ? 'scale(0.97)' : isDragging ? 'scale(0.95)' : 'scale(1)',
        ...style,
      }}
    >
      {/* Edit mode overlay — drag handle + size indicator */}
      {editMode && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold select-none cursor-grab active:cursor-grabbing"
          style={{
            background: 'rgba(15,23,42,0.92)',
            color: 'var(--text-secondary)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            border: '1px solid rgba(148,163,184,0.15)',
            backdropFilter: 'blur(12px)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseDown={() => setCanDrag(true)}
          onMouseUp={() => setCanDrag(false)}
          onMouseLeave={() => setCanDrag(false)}
        >
          <GripVertical size={14} style={{ color: 'var(--accent-blue)' }} />
          <span>{label}</span>
          {currentSize !== undefined && (
            <>
              <div className="w-px h-3 mx-1" style={{ background: 'rgba(148,163,184,0.2)' }} />
              <span className="text-[10px] font-extrabold tabular-nums" style={{ color: 'var(--accent-blue)' }}>{Math.round(currentSize)}%</span>
            </>
          )}
        </div>
      )}

      {/* Resize Handle — right edge */}
      {editMode && onResizeDirect && currentSize !== undefined && (
        <div
          className="absolute top-0 right-0 h-full w-6 cursor-col-resize z-25 flex items-center justify-center group"
          onMouseDown={handleMouseDown}
          title="Arraste para redimensionar"
        >
          <div
            className="rounded-full transition-all duration-200"
            style={{
              width: isResizing ? '3px' : '2px',
              height: isResizing ? '80px' : '40px',
              background: isResizing ? 'var(--accent-blue)' : 'rgba(148,163,184,0.3)',
              boxShadow: isResizing ? '0 0 12px var(--accent-blue)' : 'none',
            }}
          />
        </div>
      )}

      {children}
    </div>
  );
}
