'use client';

import React from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';

interface EditToolbarProps {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onReset: () => void;
}

export default function EditToolbar({ editMode, setEditMode, onReset }: EditToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {editMode && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}
        >
          <RotateCcw size={13} />
          Resetar
        </button>
      )}
      <button
        onClick={() => setEditMode(!editMode)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          background: editMode ? 'var(--accent-blue)' : 'var(--bg-secondary)',
          color: editMode ? '#fff' : 'var(--text-secondary)',
          border: editMode ? 'none' : '1px solid var(--border-primary)',
          boxShadow: editMode ? 'var(--shadow-glow-blue)' : 'none',
        }}
      >
        <Settings2 size={13} />
        {editMode ? '✓ Concluir' : 'Organizar'}
      </button>
    </div>
  );
}
