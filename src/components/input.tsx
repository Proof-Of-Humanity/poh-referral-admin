import type { InputHTMLAttributes } from 'react';

import { cx } from './cx';
import { fieldClass } from './field-styles';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cx(fieldClass, className)} />
);
