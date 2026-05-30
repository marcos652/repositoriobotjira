'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const TOAST_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: 'var(--accent-emerald)' },
  error: { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.3)', color: 'var(--accent-rose)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: 'var(--accent-amber)' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: 'var(--accent-blue)' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [exiting, setExiting] = React.useState(false);
  const colors = TOAST_COLORS[toast.type];
  const duration = toast.duration || 4000;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onRemove, 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onRemove]);

  return (
    <div
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card-solid)',
        border: `1px solid ${colors.border}`,
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(16px)',
        maxWidth: 380,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ color: colors.color, flexShrink: 0, marginTop: 1 }}>
        {TOAST_ICONS[toast.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
          {toast.title}
        </p>
        {toast.message && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(onRemove, 250); }}
        style={{
          background: 'none', border: 'none', color: 'var(--text-tertiary)',
          cursor: 'pointer', padding: 2, flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'var(--border-primary)',
      }}>
        <div style={{
          height: '100%', background: colors.color,
          animation: `shrink ${duration}ms linear both`,
        }} />
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: toasts.length ? 'auto' : 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
