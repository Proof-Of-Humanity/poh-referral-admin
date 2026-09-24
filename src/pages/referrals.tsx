import { isAddress } from 'viem';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fragment, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Field } from '../components/field';
import { FilterIcon } from '../components/icons';
import { Input } from '../components/input';
import { PageHeader } from '../components/page-header';
import { PagedTablePanel } from '../components/paged-table-panel';
import { Panel } from '../components/panel';
import { SearchInput } from '../components/search-input';
import { Select } from '../components/select';
import { api } from '../graphql/client';
import {
  PohReferralSortField,
  SortDirection,
  type AdminReferralFilter,
  type ReferralFieldsFragment as Referral,
} from '../graphql/generated';
import { useHumanityProfiles } from '../graphql/subgraph';
import { INVALID_ADDRESS_HINT } from '../lib/format';
import { ATLAS_REFRESH_INTERVAL_MS, useWhitelistedIds } from '../lib/referral-data';
import { payoutFilterOptions, payoutStateDisplay, reviewStatusDisplay, reviewStatusOptions } from '../lib/status';
import { useNow } from '../lib/use-now';
import { DAY_MS, utcDayBounds, utcDayStart, utcMonthStart } from '../lib/utc';
import { ReferralDrawerRow } from './referral-drawer';
import { REFERRAL_COLUMNS, ReferralRow, ReviewModal, SubgraphUnavailableNote, useReferrerVolume } from './referral-row';

const PAGE_SIZE = 20;

const enumFromSearchParam = <T extends string>(value: string | null, options: readonly T[]): T | '' =>
  options.find((option) => option === value) ?? '';

const timeRangeOptions = ['today', '7d', 'month', 'custom'] as const;
type TimeRange = (typeof timeRangeOptions)[number];
const timeRangeLabels: Record<TimeRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  month: 'This month',
  custom: 'Custom range',
};

type CreatedAtBounds = { createdAtFrom?: string; createdAtTo?: string };

/**
 * The bot counts in UTC, so the presets do too: "Today" starts at 00:00 UTC and "Last 7 days" is
 * today plus the six days before it, each snapped to a day boundary so the query key stays put
 * across renders. Null means the custom range cannot be queried.
 */
const createdAtBounds = (range: TimeRange | '', from: string, to: string, now: number): CreatedAtBounds | null => {
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
      if ((from && !fromDay) || (to && !toDay)) return null;
      if (fromDay && toDay && fromDay.from > toDay.to) return null;
      return {
        createdAtFrom: fromDay ? iso(fromDay.from) : undefined,
        createdAtTo: toDay ? iso(toDay.to) : undefined,
      };
    }
  }
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

export const ReferralsPage = () => {
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
  const customFrom = searchParams.get('from') ?? '';
  const customTo = searchParams.get('to') ?? '';

  const setFilter = (key: string, value: string) => {
    // Built from the live URL rather than this render's params: the router has already written
    // the previous edit there even when it has not rendered yet, so two quick edits cannot undo
    // each other.
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
    setPage(0);
  };
  const refereeField = useFilterDraft(refereeInput, (value) => setFilter('referee', value));
  const referrerField = useFilterDraft(referrerInput, (value) => setFilter('referrer', value));
  const fromField = useFilterDraft(customFrom, (value) => setFilter('from', value));
  const toField = useFilterDraft(customTo, (value) => setFilter('to', value));

  // An unparseable address must never fall through to an unfiltered list.
  const refereeInputInvalid = refereeInput !== '' && !isAddress(refereeInput);
  const referrerInputInvalid = referrerInput !== '' && !isAddress(referrerInput);
  const bounds = createdAtBounds(timeRange, customFrom, customTo, now);
  const pausedReason = refereeInputInvalid
    ? 'Finish the referee address to search'
    : referrerInputInvalid
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

  const referrals = useQuery({
    queryKey: ['referrals', page, filter],
    enabled: pausedReason === undefined,
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    // Paging keeps the rows already on screen rather than emptying the table into placeholders.
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.Referrals({
        pagination: {
          skip: page * PAGE_SIZE,
          take: PAGE_SIZE,
          orderBy: PohReferralSortField.CreatedAt,
          orderDirection: SortDirection.Desc,
        },
        filter,
      }),
    select: (data) => data.adminPohReferrals,
  });

  if (page > 0 && referrals.data?.items.length === 0) setPage(page - 1);

  const rows = referrals.data?.items.map(({ item }) => item) ?? [];
  const volume = useReferrerVolume(rows);
  const whitelist = useWhitelistedIds();
  const humanities = useHumanityProfiles(rows.map((referral) => referral.refereeHumanityId));

  return (
    <>
      <PageHeader title="Referrals" subtitle="Every referral attribution, with its review and payout state." />
      <Panel className="mb-5" title="Filters" icon={FilterIcon}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Review status">
            <Select value={reviewStatus} onChange={(event) => setFilter('reviewStatus', event.target.value)}>
              <option value="">Any</option>
              {reviewStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {reviewStatusDisplay[status].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payout status">
            <Select value={payoutStatus} onChange={(event) => setFilter('payout', event.target.value)}>
              <option value="">Any</option>
              {payoutFilterOptions.map((status) => (
                <option key={status} value={status}>
                  {payoutStateDisplay[status].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Created" hint="Dates in UTC">
            <Select value={timeRange} onChange={(event) => setFilter('range', event.target.value)}>
              <option value="">Any time</option>
              {timeRangeOptions.map((range) => (
                <option key={range} value={range}>
                  {timeRangeLabels[range]}
                </option>
              ))}
            </Select>
          </Field>
          {timeRange === 'custom' && (
            // Next to the select that revealed it on narrow screens; below it, in the same column, at three columns.
            <div className="grid grid-cols-2 gap-3 lg:order-last">
              <Field label="From" hint={bounds === null ? 'Must not be after To' : undefined} invalid={bounds === null}>
                <Input type="date" {...fromField} />
              </Field>
              <Field label="To">
                <Input type="date" {...toField} />
              </Field>
            </div>
          )}
          <Field
            label="Referee humanity"
            hint={refereeInputInvalid ? INVALID_ADDRESS_HINT : 'Filter by the referee\u2019s full address'}
            invalid={refereeInputInvalid}
          >
            <SearchInput placeholder="0x…" {...refereeField} />
          </Field>
          <Field
            label="Referrer humanity"
            hint={referrerInputInvalid ? INVALID_ADDRESS_HINT : 'Filter by the referrer\u2019s full address'}
            invalid={referrerInputInvalid}
          >
            <SearchInput placeholder="0x…" {...referrerField} />
          </Field>
        </div>
      </Panel>

      {rows.length > 0 && <SubgraphUnavailableNote humanities={humanities} />}

      <PagedTablePanel
        pageQuery={referrals}
        pageIndex={page}
        rowsPerPage={PAGE_SIZE}
        onPageChange={setPage}
        columnHeadings={REFERRAL_COLUMNS}
        noRowsMessage="No referrals match"
        pausedReason={pausedReason}
      >
        {rows.map((referral) => (
          <Fragment key={referral.id}>
            <ReferralRow
              referral={referral}
              now={now}
              volume={volume}
              whitelist={whitelist}
              humanities={humanities}
              onReview={setReferralUnderReview}
              expanded={expandedId === referral.refereeHumanityId}
              onToggle={() =>
                setExpandedId(expandedId === referral.refereeHumanityId ? null : referral.refereeHumanityId)
              }
            />
            {expandedId === referral.refereeHumanityId && <ReferralDrawerRow referral={referral} />}
          </Fragment>
        ))}
      </PagedTablePanel>

      {referralUnderReview && (
        <ReviewModal referral={referralUnderReview} onClose={() => setReferralUnderReview(null)} />
      )}
    </>
  );
};
