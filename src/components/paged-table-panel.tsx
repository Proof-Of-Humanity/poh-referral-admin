import type { ReactNode } from 'react';

import { cx } from './cx';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingBar } from './loading-bar';
import { Pagination } from './pagination';
import { Panel } from './panel';

/** The envelope every paginated admin query returns: one page of rows, plus how to page past it. */
type PageOfRows = { count: number; hasNextPage: boolean; items: unknown[] };

/**
 * The frame every admin table shares: loading, error, empty and paging states around a <tbody> the
 * page supplies. Each table's columns differ, so the rows stay the caller's job and only the states
 * around them are settled here once.
 */
export const PagedTablePanel = ({
  pageQuery,
  pageIndex,
  rowsPerPage,
  onPageChange,
  columnHeadings,
  noRowsMessage,
  pausedReason,
  children,
}: {
  pageQuery: { isPending: boolean; error: unknown; data: PageOfRows | undefined };
  /** Zero-based, matching the `skip` the API pages with. */
  pageIndex: number;
  rowsPerPage: number;
  onPageChange: (pageIndex: number) => void;
  columnHeadings: string[];
  /** Shown when the query succeeded and came back with nothing. */
  noRowsMessage: string;
  /** Why no query is running, so a deliberate pause never looks like a load that hangs. */
  pausedReason?: string;
  /** The `<tr>` rows for `pageQuery.data.items`. */
  children: ReactNode;
}) => {
  const rows = pageQuery.data;
  const hasRows = rows !== undefined && rows.items.length > 0;

  return (
    <Panel>
      {pausedReason ? (
        <EmptyState>{pausedReason}</EmptyState>
      ) : (
        <>
          {pageQuery.isPending && <LoadingBar />}
          {pageQuery.error !== null && <ErrorState error={pageQuery.error} />}
          {rows?.items.length === 0 && <EmptyState>{noRowsMessage}</EmptyState>}
          {hasRows && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    {columnHeadings.map((heading, columnIndex) => (
                      // The headings are a fixed list per table, so position identifies them.
                      <th
                        key={columnIndex}
                        className={cx(
                          'pb-3 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase',
                          // Every column but the last is padded, so the last one ends flush with the edge.
                          columnIndex < columnHeadings.length - 1 && 'pr-3',
                        )}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{children}</tbody>
              </table>
            </div>
          )}
          {hasRows && (
            <div className="mt-4">
              <Pagination
                page={pageIndex}
                pageSize={rowsPerPage}
                count={rows.count}
                hasNextPage={rows.hasNextPage}
                onPage={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
};
