import { isAddress } from 'viem';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AddressChip } from '../components/address';
import { useToast } from '../components/toast';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FilterIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  XIcon,
} from '../components/icons';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { cx } from '../components/cx';
import { ErrorState } from '../components/error-state';
import { Field } from '../components/field';
import { Input } from '../components/input';
import { Modal } from '../components/modal';
import { PageHeader } from '../components/page-header';
import { PagedTablePanel } from '../components/paged-table-panel';
import { Panel } from '../components/panel';
import { SearchInput } from '../components/search-input';
import { Select } from '../components/select';
import { Textarea } from '../components/textarea';
import { toneFill } from '../components/tone';
import { pohChains } from '../config/poh-chain';
import { api, MAX_REASON_LENGTH } from '../graphql/client';
import {
  PohReferralReviewStatus,
  PohReferralSortField,
  ReferralPayoutFilter,
  SortDirection,
  type AdminReferralFilter,
  type ReferralFieldsFragment as Referral,
} from '../graphql/generated';
import { formatDateTime, formatPnk, formatRelative, INVALID_ADDRESS_HINT } from '../lib/format';
import { referralMatches, registryOf, scanReferrals, type LookedUp, type PartyFilter } from '../lib/referral-scan';
import {
  flagFilterOptions,
  noRecordDisplay,
  payoutFilterOptions,
  payoutStateDisplay,
  registryFilterOptions,
  registryStatusBrief,
  registryStatusDisplay,
  reviewStatusDisplay,
  reviewStatusOptions,
  type RegistryFilter,
  type RegistryLookup,
  type StatusDisplay,
} from '../lib/status';
import { useNow } from '../lib/use-now';
import { DAY_MS, utcDayBounds, utcDayStart, utcMonthStart } from '../lib/utc';
import { ReferralDrawerRow } from './referral-drawer';

const PAGE_SIZE = 20;

// A backend newer than the generated types may send a status these maps do not know.
const unknownStatusDisplay = (status: string): StatusDisplay => ({ label: status, tone: 'muted' });

const enumFromSearchParam = <T extends string>(value: string | null, options: readonly T[]): T | '' =>
  options.find((option) => option === value) ?? '';

// A day the URL cannot mean is dropped like any other junk parameter.
const dayFromSearchParam = (value: string | null) => (value && utcDayBounds(value) ? value : '');

const timeRangeOptions = ['today', '7d', 'month', 'custom'] as const;
type TimeRange = (typeof timeRangeOptions)[number];
const timeRangeLabels: Record<TimeRange, string> = {
  today: 'Created today',
  '7d': 'Created in last 7 days',
  month: 'Created this month',
  custom: 'Created between…',
};

/**
 * The bot counts in UTC, so the presets do too: "Today" starts at 00:00 UTC and "Last 7 days" is
 * today plus the six days before it, each snapped to a day boundary so the query key stays put
 * across renders. Null means the custom range starts after it ends.
 */
const createdAtBounds = (
  range: TimeRange | '',
  from: string,
  to: string,
  now: number,
): { createdAtFrom?: string; createdAtTo?: string } | null => {
  const iso = (ms: number) => new Date(ms).toISOString();
  switch (range) {
    case '':
      return {};
    case 'today':
      return { createdAtFrom: iso(utcDayStart(now)) };
    case '7d':
      return { createdAtFrom: iso(utcDayStart(now) - 6 * DAY_MS) };
    case 'month':
      return { createdAtFrom: iso(utcMonthStart(now)) };
    case 'custom': {
      const fromDay = from ? utcDayBounds(from) : null;
      const toDay = to ? utcDayBounds(to) : null;
      if (fromDay && toDay && fromDay.from > toDay.to) return null;
      return {
        createdAtFrom: fromDay ? iso(fromDay.from) : undefined,
        createdAtTo: toDay ? iso(toDay.to) : undefined,
      };
    }
  }
};

/**
 * A partial address is still being typed and only pauses the list; one that no amount of typing can
 * fix is marked on the field. Mixed case is a checksum, so it can only be judged once complete.
 */
const addressInputState = (value: string): 'empty' | 'valid' | 'incomplete' | 'invalid' => {
  if (value === '') return 'empty';
  if (isAddress(value)) return 'valid';
  return value.length < 42 && /^(0|0x[0-9a-f]*)$/i.test(value) ? 'incomplete' : 'invalid';
};

/**
 * What a typed filter field shows. The URL is what the query reads, but the router applies each
 * navigation in a transition, and a controlled input bound straight to it loses keystrokes that
 * land before the previous one has rendered. So the field edits a draft and the URL follows it.
 * When the URL moves on its own (a link into this page, the browser's back button) the draft
 * follows the URL instead.
 */
const useFilterDraft = (urlValue: string, write: (value: string) => void) => {
  const [draft, setDraft] = useState(urlValue);
  const [urlValueSeen, setUrlValueSeen] = useState(urlValue);
  if (urlValue !== urlValueSeen) {
    setUrlValueSeen(urlValue);
    if (urlValue !== draft) setDraft(urlValue);
  }
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    setDraft(value);
    write(value);
  };
  return { value: draft, onChange };
};

const registryFilterLabel = (option: RegistryFilter) =>
  option === 'unverified'
    ? 'Not verified'
    : option === 'no-record'
      ? 'No record'
      : registryStatusDisplay[option].label;

const flagFilterLabels = { flagged: 'Flagged', unflagged: 'Not flagged' } as const;

// Without a label above the control, "Active" or "Pending" alone could be either status, so the
// filter's options name their field where the table badge does not need to.
const reviewFilterLabels: Record<PohReferralReviewStatus, string> = {
  [PohReferralReviewStatus.Active]: 'Review: Active',
  [PohReferralReviewStatus.NeedsReview]: 'Needs review',
  [PohReferralReviewStatus.Approved]: 'Review: Approved',
  [PohReferralReviewStatus.Rejected]: 'Review: Rejected',
};
const payoutFilterLabels: Record<ReferralPayoutFilter, string> = {
  [ReferralPayoutFilter.Unassigned]: 'Payout: Unassigned',
  [ReferralPayoutFilter.NotSent]: 'Payout: Not sent',
  [ReferralPayoutFilter.Pending]: 'Payout: Pending',
  [ReferralPayoutFilter.Confirmed]: 'Payout: Confirmed',
};

const chainNames = pohChains.map((chain) => chain.label).join(' and ');

// Every URL parameter this page reads.
const filterParams = [
  'reviewStatus',
  'payout',
  'range',
  'from',
  'to',
  'referee',
  'refereeRegistry',
  'refereeFlag',
  'referrer',
  'referrerRegistry',
  'referrerFlag',
] as const;
type FilterParam = (typeof filterParams)[number];
const inBrowserParams: FilterParam[] = ['refereeRegistry', 'refereeFlag', 'referrerRegistry', 'referrerFlag'];

const pillClass =
  'flex shrink-0 items-center gap-1 rounded-full bg-fill px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg';

export const ReferralsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [referralUnderReview, setReferralUnderReview] = useState<Referral | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const now = useNow();

  const reviewStatus = enumFromSearchParam(searchParams.get('reviewStatus'), reviewStatusOptions);
  const payoutStatus = enumFromSearchParam(searchParams.get('payout'), payoutFilterOptions);
  const refereeInput = searchParams.get('referee') ?? '';
  const referrerInput = searchParams.get('referrer') ?? '';
  const timeRange = enumFromSearchParam(searchParams.get('range'), timeRangeOptions);
  const customFrom = dayFromSearchParam(searchParams.get('from'));
  const customTo = dayFromSearchParam(searchParams.get('to'));
  const refereeFilter: PartyFilter = {
    registry: enumFromSearchParam(searchParams.get('refereeRegistry'), registryFilterOptions),
    flag: enumFromSearchParam(searchParams.get('refereeFlag'), flagFilterOptions),
  };
  const referrerFilter: PartyFilter = {
    registry: enumFromSearchParam(searchParams.get('referrerRegistry'), registryFilterOptions),
    flag: enumFromSearchParam(searchParams.get('referrerFlag'), flagFilterOptions),
  };

  // Built from the live URL rather than this render's params: the router has already written the
  // previous edit there even when it has not rendered yet, so two quick edits cannot undo each other.
  const writeParams = (edit: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    edit(params);
    setSearchParams(params, { replace: true });
    setPage(0);
  };
  const setFilter = (key: FilterParam, value: string) =>
    writeParams((params) => (value ? params.set(key, value) : params.delete(key)));
  const clearFilters = (keys: readonly FilterParam[]) =>
    writeParams((params) => keys.forEach((key) => params.delete(key)));

  const refereeField = useFilterDraft(refereeInput, (value) => setFilter('referee', value));
  const referrerField = useFilterDraft(referrerInput, (value) => setFilter('referrer', value));
  const fromField = useFilterDraft(customFrom, (value) => setFilter('from', value));
  const toField = useFilterDraft(customTo, (value) => setFilter('to', value));

  // An unparseable address must never fall through to an unfiltered list.
  const refereeState = addressInputState(refereeInput);
  const referrerState = addressInputState(referrerInput);
  const bounds = createdAtBounds(timeRange, customFrom, customTo, now);
  const pausedReason =
    refereeState === 'invalid'
      ? `Referee address: ${INVALID_ADDRESS_HINT}`
      : referrerState === 'invalid'
        ? `Referrer address: ${INVALID_ADDRESS_HINT}`
        : refereeState === 'incomplete'
          ? 'Finish the referee address to search'
          : referrerState === 'incomplete'
            ? 'Finish the referrer address to search'
            : bounds === null
              ? 'The custom range starts after it ends'
              : undefined;

  const filter: AdminReferralFilter = {
    reviewStatus: reviewStatus ? [reviewStatus] : undefined,
    payoutStatus: payoutStatus ? [payoutStatus] : undefined,
    refereeHumanityId: refereeInput || undefined,
    referrerHumanityId: referrerInput || undefined,
    ...bounds,
  };

  // Registry status lives on the subgraphs and flags have no API filter, so either one switches the
  // list from API pages to every matching referral, filtered and paged here.
  const filtersInBrowser = [refereeFilter, referrerFilter].some((party) => party.registry || party.flag);
  const lookedUp: LookedUp = { referee: refereeFilter.registry !== '', referrer: referrerFilter.registry !== '' };

  const apiPage = useQuery({
    queryKey: ['referrals', page, filter],
    enabled: pausedReason === undefined && !filtersInBrowser,
    // Paging keeps the rows already on screen rather than emptying the table into placeholders.
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api.Referrals(
        {
          pagination: {
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE,
            orderBy: PohReferralSortField.CreatedAt,
            orderDirection: SortDirection.Desc,
          },
          filter,
        },
        undefined,
        signal,
      ),
    select: ({ adminPohReferrals }) => ({ ...adminPohReferrals, items: adminPohReferrals.items.map(({ item }) => item) }),
  });

  // One query for the referrals and their registry status, so a previous result stands in as a
  // matched pair while the next loads: rows are never judged against a lookup made for other rows.
  const scan = useQuery({
    queryKey: ['referrals', 'every', filter, lookedUp],
    enabled: pausedReason === undefined && filtersInBrowser,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => scanReferrals(queryClient, filter, lookedUp, signal),
  });
  // A stand-in that did not look up a side a filter now names would file that side under "No record".
  // A disabled query still hands back its last result, so outside in-browser mode there is no scan.
  const scanned =
    filtersInBrowser &&
    scan.data &&
    (!lookedUp.referee || scan.data.lookedUp.referee) &&
    (!lookedUp.referrer || scan.data.lookedUp.referrer)
      ? scan.data
      : undefined;
  const matching = scanned?.referrals.filter((referral) =>
    referralMatches(scanned, referral, refereeFilter, referrerFilter),
  );

  const lastMatchingPage = matching ? Math.max(0, Math.ceil(matching.length / PAGE_SIZE) - 1) : 0;
  // Clamped in one step: a synchronous slice would otherwise step back one empty page per render.
  if (matching && !scan.isPlaceholderData && page > lastMatchingPage) setPage(lastMatchingPage);
  // Read from a settled page only: the stand-in while an earlier page loads is this one again, and
  // stepping back through stand-ins would loop.
  const lastApiPage = apiPage.data ? Math.max(0, Math.ceil(apiPage.data.count / PAGE_SIZE) - 1) : 0;
  if (!filtersInBrowser && apiPage.data && !apiPage.isPlaceholderData && page > lastApiPage) setPage(lastApiPage);
  const browserPage = Math.min(page, lastMatchingPage);

  const listQuery = filtersInBrowser
    ? {
        isPending: scan.error === null && matching === undefined,
        isFetching: scan.isFetching,
        // A failed refresh leaves the last result on screen, possibly with a referral just reviewed
        // under its old status, so it is as untouchable as a stand-in until Retry lands.
        isPlaceholderData: scan.isPlaceholderData || scan.error !== null,
        error: scan.error,
        data: matching && {
          count: matching.length,
          hasNextPage: (browserPage + 1) * PAGE_SIZE < matching.length,
          items: matching.slice(browserPage * PAGE_SIZE, (browserPage + 1) * PAGE_SIZE),
        },
      }
    : apiPage;

  const activeFilterCount = [
    reviewStatus,
    payoutStatus,
    timeRange,
    refereeInput,
    refereeFilter.registry,
    refereeFilter.flag,
    referrerInput,
    referrerFilter.registry,
    referrerFilter.flag,
  ].filter(Boolean).length;

  const scanStatus = ((): ReactNode => {
    if (!filtersInBrowser || pausedReason !== undefined) return null;
    if (scan.error)
      return (
        <>
          <span className="truncate text-danger">Could not load</span>
          <button type="button" onClick={() => scan.refetch()} className={pillClass}>
            Retry
          </button>
        </>
      );
    if (!matching || !scanned || scan.isPlaceholderData)
      return (
        <span className="truncate">
          {lookedUp.referee || lookedUp.referrer ? 'Loading referrals and registry status…' : 'Loading referrals…'}
        </span>
      );
    // The table already says nothing matched the API filters; "0 of 0" would only repeat it.
    if (scanned.referrals.length === 0) return null;
    return (
      <span
        className="truncate"
        title={`Registry and flag filters are applied in this browser to every referral the other filters return${
          lookedUp.referee || lookedUp.referrer ? `, with registry status read from ${chainNames}` : ''
        }.`}
      >
        <span className="font-mono text-fg">{matching.length.toLocaleString()}</span> of{' '}
        {scanned.referrals.length.toLocaleString()} match
      </span>
    );
  })();

  return (
    <>
      <PageHeader title="Referrals" subtitle="Every referral attribution, with its review and payout state." />
      <Panel
        className="mb-5"
        title="Filters"
        icon={FilterIcon}
        actions={
          <div className="flex min-w-0 items-center gap-3 text-[11.5px] text-fg-muted" aria-live="polite">
            {scanStatus}
            {activeFilterCount > 0 && (
              <button type="button" onClick={() => clearFilters(filterParams)} className={pillClass}>
                <XIcon className="size-3" />
                {/* Narrow headers keep their width for the status beside it. */}
                Clear {activeFilterCount}
                <span className="max-[720px]:hidden">{activeFilterCount === 1 ? ' filter' : ' filters'}</span>
              </button>
            )}
          </div>
        }
      >
        {/* Laid out against the panel's own width, since the sidebar takes a fixed share of the viewport. */}
        <div className="@container">
          <div className="grid gap-4 @2xl:gap-2.5">
            <FilterRow title="Referral" layout="referral">
              <Select
                aria-label="Review status"
                data-active={reviewStatus !== ''}
                value={reviewStatus}
                onChange={(event) => setFilter('reviewStatus', event.target.value)}
              >
                <option value="">Any review status</option>
                {reviewStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {reviewFilterLabels[status]}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Payout status"
                data-active={payoutStatus !== ''}
                value={payoutStatus}
                onChange={(event) => setFilter('payout', event.target.value)}
              >
                <option value="">Any payout status</option>
                {payoutFilterOptions.map((status) => (
                  <option key={status} value={status}>
                    {payoutFilterLabels[status]}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Created, in UTC days"
                title="Days are UTC, as the payout bot counts them"
                data-active={timeRange !== ''}
                value={timeRange}
                onChange={(event) => setFilter('range', event.target.value)}
              >
                <option value="">Created any time</option>
                {timeRangeOptions.map((range) => (
                  <option key={range} value={range}>
                    {timeRangeLabels[range]}
                  </option>
                ))}
              </Select>
              {timeRange === 'custom' && (
                <>
                  <Field label="From (UTC)">
                    <Input type="date" data-active={customFrom !== ''} aria-invalid={bounds === null} {...fromField} />
                  </Field>
                  <Field label="To (UTC)">
                    <Input type="date" data-active={customTo !== ''} aria-invalid={bounds === null} {...toField} />
                  </Field>
                </>
              )}
            </FilterRow>
            <FilterRow title="Referee" layout="party">
              <PartyFields
                party="referee"
                address={refereeField}
                addressState={refereeState}
                filter={refereeFilter}
                onFilter={setFilter}
              />
            </FilterRow>
            <FilterRow title="Referrer" layout="party">
              <PartyFields
                party="referrer"
                address={referrerField}
                addressState={referrerState}
                filter={referrerFilter}
                onFilter={setFilter}
              />
            </FilterRow>
          </div>
        </div>
      </Panel>

      <PagedTablePanel
        pageQuery={listQuery}
        pageIndex={filtersInBrowser ? browserPage : page}
        rowsPerPage={PAGE_SIZE}
        onPageChange={setPage}
        columnHeadings={['', 'Referee', 'Referrer', 'Review', 'Payout', 'Reward', 'Created', '']}
        noRowsMessage={
          scanned && scanned.referrals.length > 0 ? (
            <>
              {scanned.referrals.length === 1
                ? 'The only referral does not match the registry and flag filters'
                : `None of the ${scanned.referrals.length.toLocaleString()} referrals match the registry and flag filters`}
              <button type="button" onClick={() => clearFilters(inBrowserParams)} className={pillClass}>
                <XIcon className="size-3" />
                Clear registry and flag filters
              </button>
            </>
          ) : (
            'No referrals match'
          )
        }
        pausedReason={pausedReason}
      >
        {listQuery.data?.items.map((item) => (
          <Fragment key={item.id}>
            <ReferralRow
              referral={item}
              refereeRegistry={scanned && registryOf(scanned, 'referee', item.refereeHumanityId)}
              referrerRegistry={scanned && registryOf(scanned, 'referrer', item.referrerHumanityId)}
              onReview={setReferralUnderReview}
              expanded={expandedId === item.refereeHumanityId}
              onToggle={() => setExpandedId(expandedId === item.refereeHumanityId ? null : item.refereeHumanityId)}
            />
            {expandedId === item.refereeHumanityId && <ReferralDrawerRow referral={item} />}
          </Fragment>
        ))}
      </PagedTablePanel>

      {/* Keyed, so opening it for another referral can never carry this one's status and reason across. */}
      {referralUnderReview && (
        <ReviewModal
          key={referralUnderReview.refereeHumanityId}
          referral={referralUnderReview}
          onClose={() => setReferralUnderReview(null)}
        />
      )}
    </>
  );
};

// Two fields a row leaves one of three alone, and it takes the whole row rather than half of one.
const rowLayouts = {
  // The address, where a hex string needs the width.
  party: '@sm:[&>:first-child]:col-span-2 @xl:[&>:first-child]:col-span-1',
  // Created; at three a row, its From and To then sit under Payout and Created, beside what opened them.
  referral:
    '@sm:[&>:nth-child(3)]:col-span-2 @xl:[&>:nth-child(3)]:col-span-1 @xl:[&>:nth-child(4)]:col-start-2',
};

/**
 * One row of the filter grid. Wide panels put the title in a column of its own so all three rows share
 * one grid; narrower ones put it above, then fall back to two fields a row, then one. Fields sit on the
 * bottom edge, so a select beside a labelled date field lines up with the date input, not its label.
 */
const FilterRow = ({
  title,
  layout,
  children,
}: {
  title: string;
  layout: keyof typeof rowLayouts;
  children: ReactNode;
}) => {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="grid gap-2 @2xl:grid-cols-[4.5rem_minmax(0,1fr)] @2xl:items-start @2xl:gap-3"
    >
      <span id={titleId} className="text-[12px] font-semibold text-fg-muted @2xl:pt-[9px]">
        {title}
      </span>
      <div
        className={cx('grid items-end gap-2.5 @sm:grid-cols-2 @xl:grid-cols-3', rowLayouts[layout])}
      >
        {children}
      </div>
    </div>
  );
};

const PartyFields = ({
  party,
  address,
  addressState,
  filter,
  onFilter,
}: {
  party: 'referee' | 'referrer';
  address: ReturnType<typeof useFilterDraft>;
  addressState: ReturnType<typeof addressInputState>;
  filter: PartyFilter;
  onFilter: (key: FilterParam, value: string) => void;
}) => {
  const label = party === 'referee' ? 'Referee' : 'Referrer';
  return (
    <>
      <SearchInput
        aria-label={`${label} humanity address`}
        placeholder="Humanity address, 0x…"
        data-active={addressState === 'valid'}
        aria-invalid={addressState === 'invalid'}
        {...address}
      />
      <Select
        aria-label={`${label} registry status`}
        data-active={filter.registry !== ''}
        value={filter.registry}
        onChange={(event) => onFilter(`${party}Registry`, event.target.value)}
      >
        <option value="">Any registry status</option>
        <option value="verified">{registryFilterLabel('verified')}</option>
        <option value="unverified">{registryFilterLabel('unverified')}</option>
        <optgroup label="Not verified, by status">
          {registryFilterOptions
            .filter((option) => option !== 'verified' && option !== 'unverified')
            .map((option) => (
              <option key={option} value={option}>
                {registryFilterLabel(option)}
              </option>
            ))}
        </optgroup>
      </Select>
      <Select
        aria-label={`${label} flag`}
        data-active={filter.flag !== ''}
        value={filter.flag}
        onChange={(event) => onFilter(`${party}Flag`, event.target.value)}
      >
        <option value="">Flagged or not</option>
        {flagFilterOptions.map((option) => (
          <option key={option} value={option}>
            {flagFilterLabels[option]}
          </option>
        ))}
      </Select>
    </>
  );
};

const PartyCell = ({
  humanityId,
  registry,
  flagged,
}: {
  humanityId: string;
  /** Present only when a registry filter looked this party up. */
  registry: RegistryLookup | undefined;
  flagged: boolean;
}) => (
  <td className="py-3 pr-3">
    <AddressChip address={humanityId} />
    {registry !== undefined && <RegistryLine registry={registry} />}
    {flagged && (
      <div className="mt-1">
        <Badge tone="danger">Flagged</Badge>
      </div>
    )}
  </td>
);

// Quiet on purpose: the flag and the review and payout pills are decisions, and this is context.
const RegistryLine = ({ registry }: { registry: RegistryLookup }) => {
  const display = registry === 'no-record' ? noRecordDisplay : registryStatusDisplay[registry];
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] whitespace-nowrap text-fg-muted" title={display.label}>
      <span className={cx('size-1.5 shrink-0 rounded-full', toneFill[display.tone])} />
      {registryStatusBrief[registry]}
    </div>
  );
};

const ReferralRow = ({
  referral,
  refereeRegistry,
  referrerRegistry,
  onReview,
  expanded,
  onToggle,
}: {
  referral: Referral;
  refereeRegistry: RegistryLookup | undefined;
  referrerRegistry: RegistryLookup | undefined;
  onReview: (referral: Referral) => void;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const payout = referral.payoutTransaction;
  const reviewDisplay = reviewStatusDisplay[referral.reviewStatus] ?? unknownStatusDisplay(referral.reviewStatus);
  const payoutDisplay = payout
    ? (payoutStateDisplay[ReferralPayoutFilter[payout.status]] ?? unknownStatusDisplay(payout.status))
    : payoutStateDisplay.Unassigned;
  return (
    // An open row hands its bottom border to the drawer row below it, which keeps the drawer attached to
    // its own row and preserves the last:border-b-0 look the inserted drawer would otherwise defeat.
    <tr className={cx('align-top', !expanded && 'border-b border-line/60 last:border-b-0')}>
      <td className="py-3 pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide on-chain detail' : 'Show on-chain detail'}
          // Grows into the row, never past the table's left edge: the scroll container clips anything there.
          className="-my-1 -mr-1 rounded-md p-1 text-fg-faint transition-colors hover:bg-fill hover:text-accent"
        >
          {expanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        </button>
      </td>
      <PartyCell
        humanityId={referral.refereeHumanityId}
        registry={refereeRegistry}
        flagged={Boolean(referral.refereeFlag?.isFlagged)}
      />
      <PartyCell
        humanityId={referral.referrerHumanityId}
        registry={referrerRegistry}
        flagged={Boolean(referral.referrerFlag?.isFlagged)}
      />
      <td className="py-3 pr-3">
        <Badge tone={reviewDisplay.tone}>{reviewDisplay.label}</Badge>
        {referral.reviewReason && (
          <div className="mt-1 max-w-28 truncate text-xs text-fg-faint xl:max-w-40" title={referral.reviewReason}>
            {referral.reviewReason}
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <Badge tone={payoutDisplay.tone}>{payoutDisplay.label}</Badge>
        {payout?.txHash && (
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-fg-faint" title={payout.txHash}>
            <LinkIcon className="size-3.5 shrink-0" />
            {payout.txHash.slice(0, 10)}…
          </div>
        )}
      </td>
      <td className="py-3 pr-3 font-mono whitespace-nowrap text-fg">{formatPnk(referral.rewardAmount)}</td>
      <td className="py-3 pr-3 whitespace-nowrap text-fg-muted" title={formatDateTime(referral.createdAt)}>
        <span className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5 shrink-0 text-fg-faint" />
          {formatRelative(referral.createdAt)}
        </span>
      </td>
      <td className="py-3 text-right">
        <Button
          onClick={() => onReview(referral)}
          disabled={Boolean(payout)}
          title={payout ? 'Locked: a payout is already assigned' : undefined}
        >
          {payout ? <LockIcon className="size-3.5" /> : <ListIcon className="size-3.5" />}
          Review
        </Button>
      </td>
    </tr>
  );
};

// Spelled out where the choice is made: Approved in particular is an override, not a tidier Active.
const reviewStatusEffect: Record<PohReferralReviewStatus, string> = {
  [PohReferralReviewStatus.Active]:
    'Pays no sooner than 2 days after the referee verified, if every other check passes.',
  [PohReferralReviewStatus.NeedsReview]: 'Parks the referral. The bot skips it until someone changes this.',
  [PohReferralReviewStatus.Approved]:
    'Overrides the 30-day expiry and the monthly cap. Pays even if the referrer is over their limit.',
  [PohReferralReviewStatus.Rejected]: 'Never paid. Reversible until a payout is reserved.',
};

const ReviewModal = ({ referral, onClose }: { referral: Referral; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reviewStatus, setReviewStatus] = useState(referral.reviewStatus);
  const [reason, setReason] = useState('');

  const update = useMutation({
    mutationFn: () => api.UpdateReviewStatus({ refereeHumanityId: referral.refereeHumanityId, reviewStatus, reason }),
    onSuccess: async () => {
      // A read already in flight predates this review. Invalidation neither stops one whose query was
      // just disabled nor keeps it from landing as fresh, so it is cancelled first.
      await queryClient.cancelQueries({ queryKey: ['referrals'] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['referrals'] }),
        queryClient.invalidateQueries({ queryKey: ['referral-counts'] }),
      ]);
      toast(`Referral marked ${reviewStatusDisplay[reviewStatus].label}`);
      onClose();
    },
  });
  return (
    // Locked once something is typed, so a stray click on the backdrop cannot bin the reason.
    <Modal title="Update review status" onClose={onClose} locked={update.isPending || reason.trim() !== ''}>
      <div className="mb-4 grid grid-cols-2 gap-3 font-mono text-xs">
        <div>
          <div className="text-fg-faint">Referee</div>
          <AddressChip address={referral.refereeHumanityId} />
        </div>
        <div>
          <div className="text-fg-faint">Referrer</div>
          <AddressChip address={referral.referrerHumanityId} />
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Status" hint={reviewStatusEffect[reviewStatus]}>
          <Select
            value={reviewStatus}
            onChange={(event) => setReviewStatus(event.target.value as PohReferralReviewStatus)}
          >
            {reviewStatusOptions.map((status) => (
              <option key={status} value={status}>
                {reviewStatusDisplay[status].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Reason"
          hint="Required. Replaces the current note — there is no history, and the payout bot can overwrite it."
        >
          <Textarea
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why this decision was made"
          />
        </Field>
        {update.error && <ErrorState error={update.error} />}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={update.isPending}>
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            variant={reviewStatus === PohReferralReviewStatus.Rejected ? 'danger' : 'primary'}
            disabled={!reason.trim() || update.isPending}
            onClick={() => update.mutate()}
          >
            <CheckIcon className="size-3.5" />
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
