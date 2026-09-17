import type { ReactNode } from 'react';

import { InfoIcon } from './icons';

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className="block text-[11px] font-medium text-fg-muted">{label}</span>
    {children}
    {hint && (
      <span className="flex items-center gap-1.5 text-[11px] text-fg-faint">
        <InfoIcon className="size-3 shrink-0" />
        {hint}
      </span>
    )}
  </label>
);
