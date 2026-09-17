import type { ReactNode } from 'react';

import { cx } from './cx';
import type { IconComponent } from './icons';

export const Panel = (props: {
  title?: string;
  icon?: IconComponent;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cx('rounded-2xl border border-line bg-surface/80 backdrop-blur-xl', props.className)}>
    {(props.title || props.actions) && (
      // Fixed height, so panels side by side align whether or not one carries actions.
      <header className="flex h-[42px] items-center justify-between gap-4 border-b border-line px-4">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase">
          {props.icon && <props.icon className="size-3 shrink-0" />}
          {props.title}
        </h2>
        {props.actions}
      </header>
    )}
    <div className="p-4">{props.children}</div>
  </section>
);
