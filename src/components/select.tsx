import type { SelectHTMLAttributes } from 'react';

import { cx } from './cx';
import { fieldBase, fieldSize } from './field-styles';
import { ChevronDownIcon } from './icons';

// The arrow is drawn here rather than left to the browser, so its inset matches SearchInput's icon.
export const Select = ({
  className,
  compact = false,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) => (
  <span className={cx('relative', compact ? 'inline-block' : 'block')}>
    <select
      {...props}
      className={cx(
        fieldBase,
        'appearance-none',
        compact ? 'w-auto py-1.5 pr-7 pl-2.5 text-[12px]' : `${fieldSize} pr-8`,
        className,
      )}
    />
    <ChevronDownIcon
      className={cx(
        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-faint',
        compact ? 'right-2 size-3' : 'right-3 size-3.5',
      )}
    />
  </span>
);
