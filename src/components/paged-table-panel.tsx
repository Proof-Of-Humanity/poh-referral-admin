import type { ReactNode } from 'react';

import { cx } from './cx';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';
import { Pagination } from './pagination';
import { Panel } from './panel';

/** Enough placeholder rows to fill the panel without pretending to know how many are coming. */
const SKELETON_ROWS = 6;

/**
 * Hover is painted on the cells, not the <tr>, so the ends can round instead of clipping square.
 * A cell spanning the table is a detail row rather than a row you can act on, so it stays untinted.
 * The end cells are inset on every row, header included, so content never sits against that edge.
 */
export const tableClass =
  'w-full text-[13px] [&_tr>:first-child]:pl-3 [&_tr>:last-child]:pr-3 [&_tbody_tr>td]:transition-colors [&_tbody_tr:hover>td:not([colspan])]:bg-fill [&_tbody_tr:hover>td:first-child]:rounded-l-[10px] [&_tbody_tr:hover>td:last-child]:rounded-r-[10px]';

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
  pageQuery: { isPending: boolean; isFetching: boolean; error: unknown; data: PageOfRows | undefined };
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
            className="pr-3 pb-3 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase"
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
              <table className={tableClass}>
                {headerRow}
                <tbody>
                  {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                    <tr key={row} className="border-b border-line/60">
                      {columnHeadings.map((heading, columnIndex) => (
                        <td
                          key={columnIndex}
                          className={cx('py-3', columnIndex === 0 && heading === '' ? 'pr-1' : 'pr-3')}
                        >
                          {/* Staggered so the sweep reads as one surface rather than six separate ones.
                              A blank heading first is an icon-button column and a blank heading last is
                              the actions column; each placeholder matches the box its column will render,
                              or the column snaps sideways when the rows land. */}
                          {heading !== '' ? (
                            <Skeleton className="h-3.5 w-full max-w-36" delayMs={row * 90} />
                          ) : columnIndex === 0 ? (
                            <Skeleton className="size-[22px]" delayMs={row * 90} />
                          ) : (
                            <Skeleton className="ml-auto h-6 w-16" delayMs={row * 90} />
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
            // Fading the old page is enough to say "loading"; replacing it with placeholders is not.
            <div
              className={cx('overflow-x-auto transition-opacity', pageQuery.isFetching && 'opacity-50')}
              aria-busy={pageQuery.isFetching}
            >
              <table className={tableClass}>
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
