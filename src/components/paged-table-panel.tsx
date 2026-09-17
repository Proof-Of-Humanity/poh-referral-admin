import { useEffect, type ReactNode } from 'react';

import { cx } from './cx';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingBar } from './loading-bar';
import { Pagination } from './pagination';
import { Panel } from './panel';

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
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className={cx(
                          'pb-3 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase',
                          index < columns.length - 1 && 'pr-3',
                        )}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{children}</tbody>
              </table>
            </div>
          )}
          {result && result.items.length > 0 && (
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
