import type { ReactNode } from 'react';

import { cx } from './cx';
import { InfoIcon, WarningIcon } from './icons';

export const Field = ({
  label,
  hint,
  invalid = false,
  children,
}: {
  label: string;
  hint?: string;
  /** The hint explains why the value is refused, so it reads as an error rather than advice. */
  invalid?: boolean;
  children: ReactNode;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="block text-[11px] font-medium text-fg-muted">{label}</span>
    {children}
    {hint && (
      <span className={cx('flex items-center gap-1.5 text-[11px]', invalid ? 'text-danger' : 'text-fg-faint')}>
        {invalid ? <WarningIcon className="size-3 shrink-0" /> : <InfoIcon className="size-3 shrink-0" />}
        {hint}
      </span>
    )}
  </label>
);
