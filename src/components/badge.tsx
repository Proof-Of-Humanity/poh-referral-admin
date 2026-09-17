import type { ReactNode } from 'react';

import { cx } from './cx';
import type { Tone } from './tone';

const badgeTones: Record<Tone, string> = {
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/16 text-info',
  muted: 'bg-fill text-fg-muted',
};

export const Badge = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap',
      badgeTones[tone],
    )}
  >
    <span className="size-1.5 shrink-0 rounded-full bg-current" />
    {children}
  </span>
);
