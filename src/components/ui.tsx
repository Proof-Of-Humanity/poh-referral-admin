import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ClientError } from 'graphql-request';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  SearchIcon,
  TrayIcon,
  WarningIcon,
  XIcon,
  type IconComponent,
} from './icons';

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-black/85 hover:bg-accent-strong',
  ghost: 'bg-fill-strong text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] hover:bg-fill-strong/70',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
};

export const Button = ({
  variant = 'ghost',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button
    type="button"
    {...props}
    className={cx(
      'inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-medium',
      'transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35',
      buttonVariants[variant],
      className,
    )}
  />
);

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <h1 className="text-[26px] leading-tight font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-[13px] text-fg-muted">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

export const Panel = (props: {
  title?: string;
  icon?: IconComponent;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cx('rounded-2xl border border-line bg-surface/80 backdrop-blur-xl', props.className)}>
    {(props.title || props.actions) && (
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase">
          {props.icon && <props.icon className="size-3.5" />}
          {props.title}
        </h2>
        {props.actions}
      </header>
    )}
    <div className="p-4">{props.children}</div>
  </section>
);

const fieldClass =
  'w-full rounded-[10px] border border-transparent bg-fill px-3 py-2 text-[13px] text-fg transition-colors placeholder:text-fg-faint focus:border-info/70 focus:outline-none';

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-medium text-fg-muted">{label}</span>
    {children}
    {hint && (
      <span className="flex items-center gap-1 text-[11px] text-fg-faint">
        <InfoIcon className="size-3 shrink-0" />
        {hint}
      </span>
    )}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cx(fieldClass, className)} />
);

export const SearchInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <span className="relative block">
    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-faint" />
    <input {...props} className={cx(fieldClass, 'pl-8', className)} />
  </span>
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cx(fieldClass, 'min-h-24 resize-y', className)} />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cx(fieldClass, className)} />
);

export type Tone = 'accent' | 'success' | 'danger' | 'info' | 'muted';

const toneText: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  muted: 'text-fg',
};

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
    <span className="size-1.5 rounded-full bg-current" />
    {children}
  </span>
);

export const Stat = (props: { label: string; value: ReactNode; tone?: Tone; icon?: IconComponent }) => {
  const tone = props.tone ?? 'accent';
  return (
    <div className="rounded-2xl border border-line bg-surface/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-fg-muted">
        {props.icon && <props.icon className={cx('size-3.5', toneText[tone])} />}
        {props.label}
      </div>
      <div className={cx('mt-1.5 font-display text-[26px] leading-none font-semibold', toneText[tone])}>
        {props.value}
      </div>
    </div>
  );
};

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-[13px] text-fg-faint">
    <TrayIcon className="size-7 opacity-45" />
    {children}
  </div>
);

const errorMessage = (error: unknown): string => {
  if (error instanceof ClientError) return error.response.errors?.[0]?.message ?? error.message;
  return error instanceof Error ? error.message : 'Something went wrong';
};

export const ErrorState = ({ error }: { error: unknown }) => (
  <div className="flex items-start gap-2 rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-[13px] text-danger">
    <WarningIcon className="mt-px size-4 shrink-0" />
    {errorMessage(error)}
  </div>
);

export const LoadingBar = () => (
  <div className="h-0.5 w-full overflow-hidden rounded-full bg-fill">
    <div className="h-full w-1/3 animate-[slide_1.2s_linear_infinite] rounded-full bg-accent" />
  </div>
);

const Pagination = ({
  page,
  pageSize,
  count,
  hasNextPage,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number;
  hasNextPage: boolean;
  onPage: (page: number) => void;
}) => {
  const from = count === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, count);
  return (
    <div className="flex items-center justify-between border-t border-line pt-3 text-[12px] text-fg-muted">
      <span className="font-mono">
        {from}–{to} of {count}
      </span>
      <div className="flex gap-2">
        <Button disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeftIcon className="size-3.5" />
          Previous
        </Button>
        <Button disabled={!hasNextPage} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

type PagedResult = { count: number; hasNextPage: boolean; items: unknown[] };

export const PagedTablePanel = ({
  query,
  page,
  pageSize,
  onPage,
  columns,
  emptyMessage,
  paused,
  children,
}: {
  query: { isPending: boolean; error: unknown; data: PagedResult | undefined };
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  columns: string[];
  emptyMessage: string;
  /** Explains why no query is running, instead of showing a loading bar that never resolves. */
  paused?: string;
  children: ReactNode;
}) => {
  const result = query.data;
  useEffect(() => {
    if (page > 0 && result?.items.length === 0) onPage(page - 1);
  }, [page, result, onPage]);

  return (
    <Panel>
      {paused ? (
        <EmptyState>{paused}</EmptyState>
      ) : (
        <>
          {query.isPending && <LoadingBar />}
          {query.error !== null && <ErrorState error={query.error} />}
          {result && result.items.length === 0 && <EmptyState>{emptyMessage}</EmptyState>}
          {result && result.items.length > 0 && (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={cx(
                        'pb-2.5 text-[11px] font-semibold tracking-[0.04em] text-fg-faint uppercase',
                        index < columns.length - 1 && 'pr-4',
                      )}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{children}</tbody>
            </table>
          )}
          {result && (
            <div className="mt-4">
              <Pagination
                page={page}
                pageSize={pageSize}
                count={result.count}
                hasNextPage={result.hasNextPage}
                onPage={onPage}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

export const Modal = ({
  title,
  onClose,
  locked = false,
  children,
}: {
  title: string;
  onClose: () => void;
  locked?: boolean;
  children: ReactNode;
}) => {
  const titleId = useId();
  const close = () => {
    if (!locked) onClose();
  };

  useEffect(() => {
    if (locked) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [locked, onClose]);

  useEffect(() => {
    const trigger = document.activeElement;
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[18px] border border-line-strong bg-surface-raised/85 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 id={titleId} className="text-[14px] font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={close}
            disabled={locked}
            className="grid size-6 place-items-center rounded-full bg-fill text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg disabled:opacity-35"
            aria-label="Close"
          >
            <XIcon className="size-3" />
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
