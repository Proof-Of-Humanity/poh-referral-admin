import type { InputHTMLAttributes } from 'react';

import { cx } from './cx';
import { fieldClass } from './field-styles';
import { SearchIcon } from './icons';

export const SearchInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <span className="relative block">
    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-faint" />
    <input {...props} className={cx(fieldClass, 'pl-8', className)} />
  </span>
);
