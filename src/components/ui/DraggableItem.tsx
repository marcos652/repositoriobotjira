'use client';

import React, { useState, useRef } from 'react';
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
  className = '', style = {}, currentSize, minSize = 1, maxSize = 6, onResizeDirect
}: DraggableItemProps) {
  const [canDrag, setCanDrag] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = draggingId === id;
  const isDragOver = dragOverId === id && draggingId !== null && draggingId !== id;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startSize = currentSize || 2;
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const oneColWidth = rect.width / startSize;
    let lastEmittedSize = startSize;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const colChange = Math.round(deltaX / oneColWidth);
      const targetSize = startSize + colChange;
      const clampedSize = Math.max(minSize, Math.min(maxSize, targetSize));

      if (clampedSize !== lastEmittedSize && onResizeDirect) {
        lastEmittedSize = clampedSize;
        onResizeDirect(clampedSize);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
      className={`relative transition-all duration-300 ${isDragOver && editMode ? 'scale-[0.98] border-[var(--accent-blue)]' : ''} ${className}`}
      style={{
        opacity: isDragging ? 0.35 : 1,
        ...style,
      }}
    >
      {/* Edit mode overlay with drag handle */}
      {editMode && (
        <div
          className="absolute top-3 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-primary)',
          }}
        >
          {/* Drag Handle block */}
          <div
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing mr-1"
            onMouseDown={() => setCanDrag(true)}
            onMouseUp={() => setCanDrag(false)}
            onMouseLeave={() => setCanDrag(false)}
          >
            <GripVertical size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span>{label}</span>
          </div>

          {currentSize !== undefined && (
            <>
              <div className="w-px h-3 bg-border-primary mx-1.5" style={{ background: 'var(--border-primary)' }} />
              <span className="text-[10px] font-extrabold text-[var(--accent-blue)]">{currentSize}x</span>
            </>
          )}
        </div>
      )}

      {/* Resize Handle on the right edge */}
      {editMode && onResizeDirect && currentSize !== undefined && (
        <div
          className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-25 hover:bg-[var(--accent-blue)]/10 transition-all flex items-center justify-center group"
          onMouseDown={handleMouseDown}
          title="Arraste para redimensionar"
        >
          <div className="w-1.5 h-12 rounded bg-border-primary group-hover:bg-[var(--accent-blue)] transition-colors opacity-30 group-hover:opacity-100"
               style={{ background: 'var(--border-primary)' }} />
        </div>
      )}

      {/* Drop indicator overlay */}
      {isDragOver && editMode && (
        <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed pointer-events-none animate-pulse"
          style={{ borderColor: 'var(--accent-blue)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)' }} />
      )}
      {children}
    </div>
  );
}
