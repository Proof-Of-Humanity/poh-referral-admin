import type { ReactNode } from 'react';

import { TrayIcon } from './icons';

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-[13px] text-fg-faint">
    <TrayIcon className="size-7 opacity-45" />
    {children}
  </div>
);
