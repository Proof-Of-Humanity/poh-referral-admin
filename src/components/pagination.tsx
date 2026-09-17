import { Button } from './button';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export const Pagination = ({
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
      <span className="shrink-0 font-mono whitespace-nowrap">
        {from}–{to} of {count}
      </span>
      <div className="flex gap-2">
        <Button disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeftIcon className="size-3.5 shrink-0" />
          Previous
        </Button>
        <Button disabled={!hasNextPage} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRightIcon className="size-3.5 shrink-0" />
        </Button>
      </div>
    </div>
  );
};
