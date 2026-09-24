import type { ReactNode } from 'react';

import { cx } from './cx';
import { InfoIcon, WarningIcon } from './icons';
import type { Tone } from './tone';

const calloutTones: Record<Tone, string> = {
  accent: 'border-accent/35 bg-accent/10 text-accent',
  success: 'border-success/35 bg-success/10 text-success',
  danger: 'border-danger/35 bg-danger/10 text-danger',
  info: 'border-info/35 bg-info/10 text-info',
  muted: 'border-line bg-fill text-fg-muted',
};

/** A boxed note for consequences the reader must not skim past. */
export const Callout = ({ tone, className, children }: { tone: Tone; className?: string; children: ReactNode }) => (
  <div
    className={cx('flex items-start gap-2 rounded-[10px] border px-4 py-3 text-[13px]', calloutTones[tone], className)}
  >
    {tone === 'muted' || tone === 'info' ? (
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
    ) : (
      <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
    )}
    {/* min-w-0 so a long unbroken token (an address, a raw error) wraps instead of widening the page. */}
    <div className="min-w-0 break-words">{children}</div>
  </div>
);
