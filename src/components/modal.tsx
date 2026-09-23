import { useEffect, useId, useRef, type ReactNode } from 'react';

import { XIcon } from './icons';

export const Modal = ({
  title,
  onClose,
  locked = false,
  children,
}: {
  title: string;
  onClose: () => void;
  locked?: boolean;
  children: ReactNode;
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => {
    if (!locked) onClose();
  };

  useEffect(() => {
    if (locked) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [locked, onClose]);

  useEffect(() => {
    const trigger = document.activeElement;
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="m-auto w-full max-w-lg overflow-hidden rounded-[18px] border border-line-strong bg-surface-raised/85 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 id={titleId} className="text-[14px] font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={close}
            disabled={locked}
            className="grid size-6 place-items-center rounded-full bg-fill text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info/70"
            aria-label="Close"
          >
            <XIcon className="size-3" />
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
