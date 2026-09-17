import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { CheckCircleIcon, XCircleIcon } from './icons';

type Toast = { id: number; message: string; tone: 'success' | 'danger' };

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export const useToast = () => useContext(ToastContext);

let nextToastId = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = nextToastId++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex max-w-sm items-start gap-2 rounded-[14px] border border-line-strong bg-surface-raised/85 px-4 py-2.5 text-[13px] shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${
              toast.tone === 'success' ? 'text-success' : 'text-danger'
            }`}
          >
            {toast.tone === 'success' ? (
              <CheckCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <XCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
