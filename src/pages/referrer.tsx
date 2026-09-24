import { isAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { AddressChip } from '../components/address';
import { Badge } from '../components/badge';
import { Breakdown, type BreakdownRow } from '../components/breakdown';
import { buttonClassName } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import {
  ArrowRightIcon,
  BoltIcon,
  CoinIcon,
  ListIcon,
  PersonIcon,
  ReferralIcon,
  ShieldIcon,
} from '../components/icons';
import { PageHeader } from '../components/page-header';
import { Panel } from '../components/panel';
import { Skeleton } from '../components/skeleton';
import { Stat } from '../components/stat';
import type { Tone } from '../components/tone';
import { HIGH_VELOCITY_DAY, HIGH_VOLUME_MONTH, MONTHLY_PAYOUT_CAP } from '../config/referral';
import { PohReferralReviewStatus, ReferralPayoutFilter } from '../graphql/generated';
import { useHumanityProfiles, type RegistryStatus } from '../graphql/subgraph';
import { INVALID_ADDRESS_HINT } from '../lib/format';
import {
  ATLAS_REFRESH_INTERVAL_MS,
  countReferrals,
  fetchReferrals,
  includesHumanity,
  useFlaggedIds,
  useWhitelistedIds,
} from '../lib/referral-data';
import { registryStatusDisplay } from '../lib/status';
import { useNow } from '../lib/use-now';
import { DAY_MS, hourFloor, isInUtcMonth, utcMonthStart } from '../lib/utc';

import { whitelistUnknownHint } from './referral-row';

// Past this many rows the exact figures become floors, and the page says so.
const FETCH_LIMIT = 1000;

// Live registrations first, then the ways of not having one, from the most recoverable down.
const registryStatusOrder: RegistryStatus[] = [
  'verified',
  'challenged',
  'revocation-pending',
  'in-review',
  'needs-vouch',
  'expired',
  'rejected',
  'removed',
  'not-registered',
];

export const ReferrerPage = () => {
  const { humanityId = '' } = useParams();
  if (!isAddress(humanityId)) {
    return (
      <>
        <PageHeader title="Referrer" />
        <ErrorState error={new Error(INVALID_ADDRESS_HINT)} />
      </>
    );
  }
  return <ReferrerOverview humanityId={humanityId.toLowerCase()} />;
};

const ReferrerOverview = ({ humanityId }: { humanityId: string }) => {
  const now = useNow();
  const monthStart = utcMonthStart(now);
  // Re-keyed hourly so the 24-hour window keeps up without refetching every minute; the window
  // itself is measured from the fetch, so it is always 24 hours and not 24 plus most of an hour.
  const hour = hourFloor(now);

  const counts = useQuery({
    queryKey: ['referrals', 'referrer', humanityId, 'counts', monthStart, hour],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () => {
      const referrer = { referrerHumanityId: humanityId };
      return countReferrals({
        total: referrer,
        thisMonth: { ...referrer, createdAtFrom: new Date(monthStart).toISOString() },
        lastDay: { ...referrer, createdAtFrom: new Date(Date.now() - DAY_MS).toISOString() },
        active: { ...referrer, reviewStatus: [PohReferralReviewStatus.Active] },
        needsReview: { ...referrer, reviewStatus: [PohReferralReviewStatus.NeedsReview] },
        approved: { ...referrer, reviewStatus: [PohReferralReviewStatus.Approved] },
        rejected: { ...referrer, reviewStatus: [PohReferralReviewStatus.Rejected] },
        unassigned: { ...referrer, payoutStatus: [ReferralPayoutFilter.Unassigned] },
        notSent: { ...referrer, payoutStatus: [ReferralPayoutFilter.NotSent] },
        pending: { ...referrer, payoutStatus: [ReferralPayoutFilter.Pending] },
        confirmed: { ...referrer, payoutStatus: [ReferralPayoutFilter.Confirmed] },
      });
    },
  });

  // Exact cap usage: every referral with a payout, counted by when that payout was reserved.
  const reserved = useQuery({
    queryKey: ['referrals', 'referrer', humanityId, 'reserved'],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () =>
      fetchReferrals(
        {
          referrerHumanityId: humanityId,
          payoutStatus: [ReferralPayoutFilter.NotSent, ReferralPayoutFilter.Pending, ReferralPayoutFilter.Confirmed],
        },
        FETCH_LIMIT,
      ),
  });
  const reservedThisMonth = reserved.data?.items.filter(
    (referral) => referral.payoutTransaction && isInUtcMonth(referral.payoutTransaction.createdAt, now),
  ).length;

  const whitelist = useWhitelistedIds();
  // True or false once the list settles it; undefined while it loads, and for good if it failed or
  // was cut off before this humanity, in which case no cap warning is shown.
  const whitelisted = includesHumanity(whitelist.data, humanityId);

  const referrals = useQuery({
    queryKey: ['referrals', 'referrer', humanityId, 'all'],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () => fetchReferrals({ referrerHumanityId: humanityId }, FETCH_LIMIT),
  });
  const referees = referrals.data?.items ?? [];
  // The flag list settles it even for a referrer with no referrals; the rows are the fallback
  // while it loads or if it was cut off.
  const flags = useFlaggedIds();
  const flagged =
    includesHumanity(flags.data, humanityId) || referees.some((referral) => referral.referrerFlag?.isFlagged);
  const humanities = useHumanityProfiles(referees.map((referral) => referral.refereeHumanityId));

  const statusTally = new Map<RegistryStatus, number>();
  // Referees no chain knows: a humanity that never existed, or a wrong chain set.
  let noRecord = 0;
  let duplicateChallenges = 0;
  let duplicateChallengesTruncated = false;
  if (humanities.data) {
    for (const { refereeHumanityId } of referees) {
      const profile = humanities.data.get(refereeHumanityId.toLowerCase());
      if (!profile) {
        noRecord += 1;
        continue;
      }
      statusTally.set(profile.status, (statusTally.get(profile.status) ?? 0) + 1);
      duplicateChallenges += profile.duplicateChallenges.count;
      duplicateChallengesTruncated ||= profile.duplicateChallenges.truncated;
    }
  }

  const capTone: Tone =
    reservedThisMonth === undefined || whitelisted !== false
      ? 'info'
      : reservedThisMonth >= MONTHLY_PAYOUT_CAP
        ? 'danger'
        : reservedThisMonth >= MONTHLY_PAYOUT_CAP - 5
          ? 'accent'
          : 'success';
  // The same thresholds the queue flags on, so a number reads the same on both pages.
  const monthTone: Tone = (counts.data?.thisMonth ?? 0) >= HIGH_VOLUME_MONTH ? 'accent' : 'info';
  const dayTone: Tone = (counts.data?.lastDay ?? 0) >= HIGH_VELOCITY_DAY ? 'accent' : 'info';

  return (
    <>
      <PageHeader
        title="Referrer"
        actions={
          <Link to={`/referrals?referrer=${humanityId}`} className={buttonClassName()}>
            View all referrals
            <ArrowRightIcon className="size-3.5" />
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5">
          <PersonIcon className="size-3.5 shrink-0 text-fg-faint" />
          <AddressChip address={humanityId} />
        </span>
        {flagged && <Badge tone="danger">Flagged</Badge>}
        {whitelisted && <Badge tone="info">Whitelisted</Badge>}
      </div>

      {counts.error !== null && <ErrorState error={counts.error} />}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Referrals" value={countOr(counts.data?.total)} tone="muted" icon={ReferralIcon} />
        <Stat label="Created this month" value={countOr(counts.data?.thisMonth)} tone={monthTone} icon={ReferralIcon} />
        <Stat label="Created last 24h" value={countOr(counts.data?.lastDay)} tone={dayTone} icon={BoltIcon} />
        <Stat
          label="Reserved this month"
          value={
            reserved.error ? (
              <span className="text-[15px] text-fg-faint">unavailable</span>
            ) : reservedThisMonth === undefined || whitelist.isPending ? (
              <Skeleton className="h-[26px] w-10" />
            ) : (
              <span className="whitespace-nowrap">
                {reservedThisMonth}
                <span className="text-[15px] text-fg-muted">
                  {whitelisted ? ' · no cap' : whitelisted === false ? ` / ${MONTHLY_PAYOUT_CAP}` : ' · cap unknown'}
                </span>
              </span>
            )
          }
          tone={capTone}
          icon={CoinIcon}
        />
      </div>
      <p className="mt-2 text-[12px] text-fg-muted">
        {whitelisted
          ? 'Whitelisted, so the monthly cap does not apply. Reserved counts payouts reserved this UTC month.'
          : whitelisted === undefined && !whitelist.isPending
            ? `${whitelistUnknownHint(whitelist)} Reserved counts payouts reserved this UTC month.`
            : 'Cap usage counts payouts reserved this UTC month, which is how the bot enforces it. Approved referrals bypass the cap.'}
        {reserved.data?.truncated &&
          ` Only the newest ${FETCH_LIMIT} of ${reserved.data.count} paid referrals were read, so this is a floor.`}
      </p>

      <div className="mt-5 grid gap-2.5 lg:grid-cols-3">
        <Panel title="Review status" icon={ListIcon}>
          {counts.data ? (
            <Breakdown
              rows={[
                ['Active', counts.data.active, 'info'],
                ['Needs review', counts.data.needsReview, 'accent'],
                ['Approved', counts.data.approved, 'success'],
                ['Rejected', counts.data.rejected, 'danger'],
              ]}
              total={counts.data.total}
            />
          ) : (
            <BreakdownSkeleton />
          )}
        </Panel>
        <Panel title="Payout status" icon={CoinIcon}>
          {counts.data ? (
            <Breakdown
              rows={[
                ['Unassigned', counts.data.unassigned, 'muted'],
                ['Not sent', counts.data.notSent, 'accent'],
                ['Pending', counts.data.pending, 'info'],
                ['Confirmed', counts.data.confirmed, 'success'],
              ]}
              total={counts.data.total}
            />
          ) : (
            <BreakdownSkeleton />
          )}
        </Panel>
        <Panel title="Referee PoH status" icon={ShieldIcon}>
          {referrals.error || humanities.error ? (
            <ErrorState error={referrals.error ?? humanities.error} />
          ) : referrals.data && referees.length === 0 ? (
            <EmptyState>No referrals yet</EmptyState>
          ) : humanities.data ? (
            <>
              <Breakdown
                rows={[
                  ...registryStatusOrder
                    .filter((status) => statusTally.has(status))
                    .map((status): BreakdownRow => {
                      const { label, tone } = registryStatusDisplay[status];
                      return [label, statusTally.get(status) ?? 0, tone];
                    }),
                  ...(noRecord > 0 ? [['No record', noRecord, 'muted'] as BreakdownRow] : []),
                ]}
                total={referees.length}
              />
              <div className="mt-4 flex items-start justify-between gap-3 border-t border-line pt-3 font-mono text-xs">
                <span className="text-fg-muted">
                  Sybil / identity-theft challenges
                  <span className="mt-0.5 block text-[11px] text-fg-faint">
                    Duplicate-account signal, not a verdict
                  </span>
                </span>
                <span className={duplicateChallenges > 0 ? 'text-danger' : 'text-fg'}>
                  {duplicateChallengesTruncated && '≥ '}
                  {duplicateChallenges}
                </span>
              </div>
              {referrals.data?.truncated && (
                <p className="mt-3 text-[12px] text-fg-muted">
                  Read from the newest {FETCH_LIMIT} of {referrals.data.count} referrals.
                </p>
              )}
            </>
          ) : (
            <BreakdownSkeleton />
          )}
        </Panel>
      </div>
    </>
  );
};

const countOr = (value: number | undefined) => value ?? <Skeleton className="h-[26px] w-10" />;

const BreakdownSkeleton = () => (
  <ul className="space-y-3">
    {Array.from({ length: 4 }, (_, row) => (
      <li key={row}>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" delayMs={row * 80} />
          <Skeleton className="h-3 w-8" delayMs={row * 80} />
        </div>
        <Skeleton className="mt-1.5 h-1 w-full" delayMs={row * 80} />
      </li>
    ))}
  </ul>
);
