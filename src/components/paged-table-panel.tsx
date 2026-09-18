import type { ReactNode } from 'react';

import { cx } from './cx';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';
import { Pagination } from './pagination';
import { Panel } from './panel';

/** Enough placeholder rows to fill the panel without pretending to know how many are coming. */
const SKELETON_ROWS = 6;

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

  const headerRow = (
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
  );

  return (
    <Panel>
      {pausedReason ? (
        <EmptyState>{pausedReason}</EmptyState>
      ) : (
        <>
          {pageQuery.isPending && (
            <div className="overflow-x-auto" aria-busy="true" aria-label="Loading rows">
              <table className="w-full text-[13px]">
                {headerRow}
                <tbody>
                  {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                    <tr key={row} className="border-b border-line/60">
                      {columnHeadings.map((heading, columnIndex) => (
                        <td key={columnIndex} className="py-3 pr-3">
                          {/* Staggered so the sweep reads as one surface rather than six separate ones.
                              A blank heading is the actions column, so that placeholder is button-shaped. */}
                          {heading === '' ? (
                            <Skeleton className="ml-auto h-6 w-16" delayMs={row * 90} />
                          ) : (
                            <Skeleton className="h-3.5 w-full max-w-36" delayMs={row * 90} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pageQuery.error !== null && <ErrorState error={pageQuery.error} />}
          {rows?.items.length === 0 && <EmptyState>{noRowsMessage}</EmptyState>}
          {hasRows && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                {headerRow}
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
