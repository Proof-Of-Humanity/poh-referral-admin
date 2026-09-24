import type { ButtonHTMLAttributes } from 'react';

import { cx } from './cx';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-black/85 hover:bg-accent-strong',
  // Hover also answers with accent, because inside a table row the row's own tint cancels the fill change out.
  ghost: 'bg-fill-strong text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] hover:bg-fill-strong/70 hover:text-accent',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
};

/** The button's look on its own, for a link that should read as one without nesting a button in it. */
export const buttonClassName = (variant: ButtonVariant = 'ghost', className?: string) =>
  cx(
    'inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-medium whitespace-nowrap [&>svg]:shrink-0',
    'transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35',
    buttonVariants[variant],
    className,
  );

export const Button = ({
  variant = 'ghost',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button type="button" {...props} className={buttonClassName(variant, className)} />
);
