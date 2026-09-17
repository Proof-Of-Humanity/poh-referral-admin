import type { ReactNode } from 'react';

import { cx } from './cx';
import type { IconComponent } from './icons';
import { toneText, type Tone } from './tone';

export const Stat = (props: { label: string; value: ReactNode; tone?: Tone; icon?: IconComponent }) => {
  const tone = props.tone ?? 'accent';
  return (
    <div className="rounded-2xl border border-line bg-surface/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-fg-muted">
        {props.icon && <props.icon className={cx('size-3.5 shrink-0', toneText[tone])} />}
        <span className="truncate">{props.label}</span>
      </div>
      <div className={cx('mt-1.5 font-display text-[26px] leading-none font-semibold', toneText[tone])}>
        {props.value}
      </div>
    </div>
  );
};
