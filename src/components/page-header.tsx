import type { ReactNode } from 'react';

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-[26px] leading-tight font-bold break-words">{title}</h1>
      {subtitle && <p className="mt-1 text-[13px] text-fg-muted">{subtitle}</p>}
    </div>
    {actions}
  </div>
);
