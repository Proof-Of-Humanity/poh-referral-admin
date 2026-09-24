import { isAddress } from 'viem';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState, type ChangeEvent } from 'react';
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
import { Callout } from '../components/callout';
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
import type { Tone } from '../components/tone';
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
import {
  payoutFilterOptions,
  payoutStateDisplay,
  reviewStatusDisplay,
  reviewStatusOptions,
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

      <PagedTablePanel
        pageQuery={referrals}
        pageIndex={page}
        rowsPerPage={PAGE_SIZE}
        onPageChange={setPage}
        columnHeadings={['', 'Referee', 'Referrer', 'Review', 'Payout', 'Reward', 'Created', '']}
        noRowsMessage="No referrals match"
        pausedReason={pausedReason}
      >
        {referrals.data?.items.map(({ item }) => (
          <Fragment key={item.id}>
            <ReferralRow
              referral={item}
              onReview={setReferralUnderReview}
              expanded={expandedId === item.refereeHumanityId}
              onToggle={() => setExpandedId(expandedId === item.refereeHumanityId ? null : item.refereeHumanityId)}
            />
            {expandedId === item.refereeHumanityId && <ReferralDrawerRow referral={item} />}
          </Fragment>
        ))}
      </PagedTablePanel>

      {referralUnderReview && (
        <ReviewModal referral={referralUnderReview} onClose={() => setReferralUnderReview(null)} />
      )}
    </>
  );
};

const ReferralRow = ({
  referral,
  onReview,
  expanded,
  onToggle,
}: {
  referral: Referral;
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
      <td className="py-3 pr-3">
        <AddressChip address={referral.refereeHumanityId} />
        {referral.refereeFlag?.isFlagged && (
          <div className="mt-1">
            <Badge tone="danger">Flagged</Badge>
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <AddressChip address={referral.referrerHumanityId} />
        {referral.referrerFlag?.isFlagged && (
          <div className="mt-1">
            <Badge tone="danger">Flagged</Badge>
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <Badge tone={reviewDisplay.tone}>{reviewDisplay.label}</Badge>
        {referral.reviewReason && (
          <div className="mt-1 max-w-40 truncate text-xs text-fg-faint" title={referral.reviewReason}>
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

// The two outcomes that move money or refuse it get a box, not a hint line.
const reviewStatusWarning: Partial<Record<PohReferralReviewStatus, { tone: Tone; text: string }>> = {
  [PohReferralReviewStatus.Approved]: {
    tone: 'accent',
    text: 'Approved pays past the 30-day expiry and over the monthly cap, whitelist or not. Use it to rescue a legitimate referral, not to clear a queue.',
  },
  [PohReferralReviewStatus.Rejected]: {
    tone: 'danger',
    text: 'Rejected is never paid. You can undo it until the payout bot reserves the referral, after which no status change is accepted.',
  },
};

const ReviewModal = ({ referral, onClose }: { referral: Referral; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reviewStatus, setReviewStatus] = useState(referral.reviewStatus);
  const [reason, setReason] = useState('');
  const warning = reviewStatusWarning[reviewStatus];

  const update = useMutation({
    mutationFn: () => api.UpdateReviewStatus({ refereeHumanityId: referral.refereeHumanityId, reviewStatus, reason }),
    onSuccess: async () => {
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
        {/* The boxed warning says everything the hint would, so only one of them shows. */}
        <Field label="Status" hint={warning ? undefined : reviewStatusEffect[reviewStatus]}>
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
        {warning && <Callout tone={warning.tone}>{warning.text}</Callout>}
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
