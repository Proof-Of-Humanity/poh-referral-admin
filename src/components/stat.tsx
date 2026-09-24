import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cx } from './cx';
import type { IconComponent } from './icons';
import { toneText, type Tone } from './tone';

/** With `to`, the whole card is a link to where the number can be acted on. */
export const Stat = (props: { label: string; value: ReactNode; tone?: Tone; icon?: IconComponent; to?: string }) => {
  const tone = props.tone ?? 'accent';
  const className = cx(
    'block rounded-2xl border border-line bg-surface/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    props.to && 'transition-colors hover:border-line-strong hover:bg-fill',
  );
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-fg-muted">
        {props.icon && <props.icon className={cx('size-3.5 shrink-0', toneText[tone])} />}
        <span className="truncate">{props.label}</span>
      </div>
      <div className={cx('mt-1.5 font-display text-[26px] leading-none font-semibold', toneText[tone])}>
        {props.value}
      </div>
    </>
  );
  return props.to ? (
    <Link to={props.to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};
