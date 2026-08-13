'use client';

import React from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';
import { TickCircle } from 'iconsax-react';

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
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}
        >
          <RotateCcw size={13} />
          Resetar
        </button>
      )}
      <button
        aria-pressed={editMode}
        onClick={() => setEditMode(!editMode)}
        type="button"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
        style={{
          background: editMode ? 'var(--accent-blue)' : 'var(--bg-secondary)',
          color: editMode ? '#fff' : 'var(--text-secondary)',
          border: editMode ? 'none' : '1px solid var(--border-primary)',
        }}
      >
        {editMode ? <TickCircle size={14} variant="Bold" /> : <Settings2 size={13} />}
        {editMode ? 'Concluir' : 'Organizar'}
      </button>
    </div>
  );
}
