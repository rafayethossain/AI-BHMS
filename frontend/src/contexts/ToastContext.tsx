import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface ToastContextType {
  toast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  const colors: Record<string, string> = {
    success: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500 bg-red-500/10 text-red-400',
    info: 'border-blue-500 bg-blue-500/10 text-blue-400',
    warning: 'border-amber-500 bg-amber-500/10 text-amber-400',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
              shadow-lg animate-slide-in ${colors[t.type]}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="text-lg font-bold">{icons[t.type]}</span>
            <span className="text-sm text-heading">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
