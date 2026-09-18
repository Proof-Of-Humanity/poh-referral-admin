import { cx } from './cx';

/**
 * A placeholder shaped like the thing still loading, so the page keeps its layout instead of
 * collapsing to a spinner and jumping when the data lands. The sweep is what says "working";
 * a static block reads as broken.
 */
export const Skeleton = ({ className, delayMs = 0 }: { className?: string; delayMs?: number }) => (
  <span className={cx('relative block overflow-hidden rounded-[5px] bg-fill', className)}>
    <span
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
      style={{ animationDelay: `${delayMs}ms` }}
    />
  </span>
);
