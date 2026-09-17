import type { TextareaHTMLAttributes } from 'react';

import { cx } from './cx';
import { fieldClass } from './field-styles';

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cx(fieldClass, 'min-h-24 resize-y', className)} />
);
