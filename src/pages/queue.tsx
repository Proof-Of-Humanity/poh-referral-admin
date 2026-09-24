import { useQuery } from '@tanstack/react-query';
import { Fragment, useState, type ReactNode } from 'react';

import { AddressChip } from '../components/address';
import { Badge } from '../components/badge';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { Callout } from '../components/callout';
import { BoltIcon, ClockIcon, FlagIcon, WarningIcon, type IconComponent } from '../components/icons';
import { PageHeader } from '../components/page-header';
import { tableClass } from '../components/paged-table-panel';
import { Panel } from '../components/panel';
import { PanelLink } from '../components/panel-link';
import { Skeleton } from '../components/skeleton';
import { HIGH_VELOCITY_DAY, HIGH_VOLUME_MONTH, REFERRAL_EXPIRY_MS } from '../config/referral';
import { api } from '../graphql/client';
import {
  PohReferralReviewStatus,
  PohReferralSortField,
  ReferralPayoutFilter,
  SortDirection,
  type ReferralFieldsFragment as Referral,
} from '../graphql/generated';
import { useHumanityProfiles } from '../graphql/subgraph';
import { derivePayoutTiming } from '../lib/payout-timing';
import {
  ATLAS_REFRESH_INTERVAL_MS,
  fetchReferrals,
  includesHumanity,
  useWhitelistedIds,
  type ReferralBatch,
} from '../lib/referral-data';
import { useNow } from '../lib/use-now';
import { DAY_MS, hourFloor, utcMonthStart } from '../lib/utc';

import { ReferralDrawerRow } from './referral-drawer';
import { REFERRAL_COLUMNS, ReferralRow, ReviewModal, useReferrerVolume } from './referral-row';

// Enough to act on without pushing the time-bound section below the fold; the rest is a link away.
const NEEDS_REVIEW_PAGE = 10;
// Upper bound on the payout candidates read. Past it the section says the scan is incomplete.
const NEARING_SCAN_LIMIT = 2000;
const MONTH_SCAN_LIMIT = 1000;

/**
 * Every unassigned referral the bot could still pay: Active ones inside the 30-day expiry and
 * Approved ones of any age, which skip it. Approved is read first, since it is the smaller set and
 * the one no date bounds; Active gets what is left of the limit.
 */
const fetchPayoutCandidates = async (activeFrom: number): Promise<ReferralBatch> => {
  const payoutStatus = [ReferralPayoutFilter.Unassigned];
  const approved = await fetchReferrals(
    { reviewStatus: [PohReferralReviewStatus.Approved], payoutStatus },
    NEARING_SCAN_LIMIT,
  );
  const active = await fetchReferrals(
    {
      reviewStatus: [PohReferralReviewStatus.Active],
      payoutStatus,
      createdAtFrom: new Date(activeFrom).toISOString(),
    },
    NEARING_SCAN_LIMIT - approved.items.length,
  );
  return {
    items: [...approved.items, ...active.items],
    truncated: approved.truncated || active.truncated,
    count: approved.count + active.count,
  };
};

export const QueuePage = () => {
  const now = useNow();
  const [referralUnderReview, setReferralUnderReview] = useState<Referral | null>(null);

  const needsReview = useQuery({
    queryKey: ['referrals', 'queue', 'needs-review'],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () =>
      api.Referrals({
        pagination: {
          skip: 0,
          take: NEEDS_REVIEW_PAGE,
          orderBy: PohReferralSortField.CreatedAt,
          orderDirection: SortDirection.Desc,
        },
        filter: { reviewStatus: [PohReferralReviewStatus.NeedsReview] },
      }),
    select: (data) => ({
      count: data.adminPohReferrals.count,
      items: data.adminPohReferrals.items.map(({ item }) => item),
    }),
  });

  // Floored to the hour so the key holds still between clock ticks. Starting up to an hour early only
  // adds referrals that have just expired, which the timing below drops.
  const activeFrom = hourFloor(now) - REFERRAL_EXPIRY_MS;
  const unassigned = useQuery({
    queryKey: ['referrals', 'queue', 'unassigned', activeFrom],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () => fetchPayoutCandidates(activeFrom),
  });
  const unassignedItems = unassigned.data?.items ?? [];
  const humanities = useHumanityProfiles(unassignedItems.map((referral) => referral.refereeHumanityId));
  // Past the safety window already, or within a day of it: the referrals an admin can still stop
  // but not for long.
  const profiles = humanities.error ? undefined : humanities.data;
  const nearing = profiles
    ? unassignedItems
        .flatMap((referral) => {
          const timing = derivePayoutTiming(referral, profiles.get(referral.refereeHumanityId.toLowerCase()), now);
          if (!timing || (timing.kind !== 'eligible' && timing.kind !== 'countdown')) return [];
          return timing.eligibleAt - now <= DAY_MS ? [{ referral, eligibleAt: timing.eligibleAt }] : [];
        })
        .sort((a, b) => a.eligibleAt - b.eligibleAt)
        .map(({ referral }) => referral)
    : [];

  const monthStart = utcMonthStart(now);
  // The 24-hour window can reach back into last month, so the scan starts at whichever is earlier.
  const scanFrom = Math.min(monthStart, hourFloor(now) - DAY_MS);
  const recent = useQuery({
    queryKey: ['referrals', 'queue', 'recent', scanFrom],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () => fetchReferrals({ createdAtFrom: new Date(scanFrom).toISOString() }, MONTH_SCAN_LIMIT),
  });
  const highVolume = groupByReferrer(recent.data?.items ?? [], monthStart, now);

  const flagged = useQuery({
    queryKey: ['flagged', 'count'],
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: () => api.FlaggedHumanities({ pagination: { take: 1 } }),
    select: (data) => data.adminPohFlaggedHumanities.count,
  });

  const whitelist = useWhitelistedIds();
  const needsReviewVolume = useReferrerVolume(needsReview.data?.items ?? []);
  const needsReviewHumanities = useHumanityProfiles((needsReview.data?.items ?? []).map((r) => r.refereeHumanityId));
  const nearingVolume = useReferrerVolume(nearing);

  const nearingState: SectionState =
    unassigned.error || humanities.error
      ? { kind: 'error', error: unassigned.error ?? humanities.error }
      : unassigned.isPending || (unassignedItems.length > 0 && humanities.isPending)
        ? { kind: 'loading' }
        : { kind: 'ready' };

  return (
    <>
      <PageHeader title="Review queue" subtitle="What needs a decision now, and what the bot will pay next. Refreshes every minute." />
      <div className="space-y-5">
        <Section
          title="Nearing payout"
          icon={ClockIcon}
          count={nearingState.kind === 'ready' ? nearing.length : nearingState.kind === 'loading' ? undefined : null}
          countIsFloor={unassigned.data?.truncated}
          link={{ to: '/referrals?payout=Unassigned', label: 'View all unassigned' }}
          state={nearingState}
          note={[
            'Unassigned Active referrals from the last 30 days and unassigned Approved ones of any age, whose referee clears the safety window within 24 hours or already has.',
            'Past the window the bot still runs its other checks, so not every one will be paid. Once the bot reserves one, no status change is accepted.',
            unassigned.data?.truncated
              ? `Only ${unassigned.data.items.length} of ${unassigned.data.count} candidates were read; the rest were not checked.`
              : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
          empty={
            unassigned.data?.truncated
              ? {
                  incomplete: `Scan incomplete: none of the ${unassigned.data.items.length} candidates read is close to payout, but the rest were not checked, so this is not a clear queue.`,
                }
              : 'No referral is close to payout'
          }
          rows={nearing}
        >
          {(referral, expanded, onToggle) => (
            <ReferralRow
              referral={referral}
              now={now}
              volume={nearingVolume}
              whitelist={whitelist}
              humanities={humanities}
              onReview={setReferralUnderReview}
              expanded={expanded}
              onToggle={onToggle}
            />
          )}
        </Section>

        <Section
          title="Needs review"
          icon={WarningIcon}
          count={needsReview.error ? null : needsReview.data?.count}
          link={{ to: '/referrals?reviewStatus=NeedsReview', label: 'View all' }}
          state={
            needsReview.error
              ? { kind: 'error', error: needsReview.error }
              : needsReview.isPending
                ? { kind: 'loading' }
                : { kind: 'ready' }
          }
          note={
            needsReview.data && needsReview.data.count > NEEDS_REVIEW_PAGE
              ? `Showing the newest ${NEEDS_REVIEW_PAGE} of ${needsReview.data.count}.`
              : undefined
          }
          empty="Nothing is parked for review"
          rows={needsReview.data?.items ?? []}
        >
          {(referral, expanded, onToggle) => (
            <ReferralRow
              referral={referral}
              now={now}
              volume={needsReviewVolume}
              whitelist={whitelist}
              humanities={needsReviewHumanities}
              onReview={setReferralUnderReview}
              expanded={expanded}
              onToggle={onToggle}
            />
          )}
        </Section>

        <Panel
          title="High-volume referrers this month"
          icon={BoltIcon}
          actions={
            <span className="flex items-center gap-2">
              <Count
                value={recent.error ? null : recent.data ? highVolume.length : undefined}
                floor={recent.data?.truncated}
              />
              <PanelLink to="/referrals?range=month">View month</PanelLink>
            </span>
          }
        >
          {recent.error !== null && <ErrorState error={recent.error} />}
          {recent.isPending && <LoadingLines />}
          {recent.data && (
            <>
              <p className="mb-3 text-[12px] text-fg-muted">
                Referrers with {HIGH_VOLUME_MONTH} or more referrals created this UTC month, or {HIGH_VELOCITY_DAY} or
                more in the last 24 hours.
                {recent.data.truncated &&
                  ` Counted from ${recent.data.items.length} of ${recent.data.count} referrals in that window, so the totals are floors.`}
              </p>
              {highVolume.length === 0 && recent.data.truncated ? (
                <Callout tone="accent">
                  Scan incomplete: no referrer reaches the thresholds in the {recent.data.items.length} referrals read,
                  but the rest were not counted, so this is not a clean month.
                </Callout>
              ) : highVolume.length === 0 ? (
                <EmptyState>No referrer is above the volume thresholds</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr className="border-b border-line text-left">
                        <Heading>Referrer</Heading>
                        <Heading className="text-right">This month</Heading>
                        <Heading className="text-right">Last 24h</Heading>
                        <Heading>Signal</Heading>
                      </tr>
                    </thead>
                    <tbody>
                      {highVolume.map((row) => (
                        <tr key={row.referrerId} className="border-b border-line/60 last:border-b-0">
                          <td className="py-3 pr-3">
                            <AddressChip address={row.referrerId} to={`/referrers/${row.referrerId}`} />
                          </td>
                          <td className="py-3 pr-3 text-right font-mono tabular-nums">{row.month}</td>
                          <td className="py-3 pr-3 text-right font-mono tabular-nums">{row.day}</td>
                          <td className="py-3">
                            <div className="flex gap-1.5">
                              {row.month >= HIGH_VOLUME_MONTH && <Badge tone="accent">High volume</Badge>}
                              {row.day >= HIGH_VELOCITY_DAY && <Badge tone="danger">{HIGH_VELOCITY_DAY}+ in 24h</Badge>}
                              {/* Exempt from the cap on purpose, so the volume is not by itself a reason to chase them. */}
                              {includesHumanity(whitelist.data, row.referrerId) && <Badge tone="info">Whitelisted</Badge>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel
          title="Flagged humanities"
          icon={FlagIcon}
          actions={
            <span className="flex items-center gap-2">
              <Count value={flagged.error ? null : flagged.data} />
              <PanelLink to="/flags">View all</PanelLink>
            </span>
          }
        >
          {flagged.error !== null && <ErrorState error={flagged.error} />}
          {flagged.isPending && <Skeleton className="h-3.5 w-full max-w-sm" />}
          {flagged.data !== undefined && (
            <p className="text-[13px] text-fg-muted">
              {flagged.data === 0
                ? 'No humanity is flagged. Flags pause every referral the humanity appears in.'
                : `${flagged.data} ${flagged.data === 1 ? 'humanity is' : 'humanities are'} flagged, pausing every referral they appear in.`}
            </p>
          )}
        </Panel>
      </div>

      {referralUnderReview && (
        <ReviewModal referral={referralUnderReview} onClose={() => setReferralUnderReview(null)} />
      )}
    </>
  );
};

type ReferrerVolumeRow = { referrerId: string; month: number; day: number };

const groupByReferrer = (referrals: Referral[], monthStart: number, now: number): ReferrerVolumeRow[] => {
  const rows = new Map<string, ReferrerVolumeRow>();
  for (const referral of referrals) {
    const referrerId = referral.referrerHumanityId.toLowerCase();
    const row = rows.get(referrerId) ?? { referrerId, month: 0, day: 0 };
    const createdAt = new Date(referral.createdAt).getTime();
    if (createdAt >= monthStart) row.month += 1;
    if (createdAt >= now - DAY_MS) row.day += 1;
    rows.set(referrerId, row);
  }
  return [...rows.values()]
    .filter((row) => row.month >= HIGH_VOLUME_MONTH || row.day >= HIGH_VELOCITY_DAY)
    .sort((a, b) => b.day - a.day || b.month - a.month);
};

type SectionState = { kind: 'loading' } | { kind: 'error'; error: unknown } | { kind: 'ready' };

/** A referral table with the same drawer the referrals page opens, one row open at a time. */
const Section = ({
  title,
  icon,
  count,
  countIsFloor,
  link,
  state,
  note,
  empty,
  rows,
  children,
}: {
  title: string;
  icon: IconComponent;
  count: number | null | undefined;
  countIsFloor?: boolean;
  link: { to: string; label: string };
  state: SectionState;
  note?: string;
  /** What no rows means; an incomplete scan says so instead of reading as nothing to do. */
  empty: string | { incomplete: string };
  rows: Referral[];
  children: (referral: Referral, expanded: boolean, onToggle: () => void) => ReactNode;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <Panel
      title={title}
      icon={icon}
      actions={
        <span className="flex items-center gap-2">
          <Count value={count} floor={countIsFloor} />
          <PanelLink to={link.to}>{link.label}</PanelLink>
        </span>
      }
    >
      {note && <p className="mb-3 text-[12px] text-fg-muted">{note}</p>}
      {state.kind === 'error' && <ErrorState error={state.error} />}
      {state.kind === 'loading' && <LoadingLines />}
      {state.kind === 'ready' &&
        (rows.length === 0 ? (
          typeof empty === 'string' ? (
            <EmptyState>{empty}</EmptyState>
          ) : (
            <Callout tone="accent">{empty.incomplete}</Callout>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr className="border-b border-line text-left">
                  {REFERRAL_COLUMNS.map((heading, index) => (
                    <Heading key={index}>{heading}</Heading>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((referral) => {
                  const expanded = expandedId === referral.refereeHumanityId;
                  return (
                    <Fragment key={referral.id}>
                      {children(referral, expanded, () => setExpandedId(expanded ? null : referral.refereeHumanityId))}
                      {expanded && <ReferralDrawerRow referral={referral} />}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </Panel>
  );
};

const Heading = ({ children, className }: { children: ReactNode; className?: string }) => (
  <th
    className={`pr-3 pb-3 text-[11px] font-semibold tracking-[0.05em] whitespace-nowrap text-fg-faint uppercase ${className ?? ''}`}
  >
    {children}
  </th>
);

/** Undefined while loading, null when the number cannot be had; a floor when the scan was cut off. */
const Count = ({ value, floor }: { value: number | null | undefined; floor?: boolean }) =>
  value === undefined ? (
    <Skeleton className="h-4 w-8" />
  ) : (
    <span
      className={`rounded-full bg-fill px-2.5 py-0.5 font-mono text-[11.5px] ${value === null ? 'text-fg-faint' : 'text-fg'}`}
    >
      {value === null ? '–' : floor ? `≥ ${value}` : value}
    </span>
  );

const LoadingLines = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: 3 }, (_, row) => (
      <Skeleton key={row} className="h-3.5 w-full max-w-md" delayMs={row * 90} />
    ))}
  </div>
);
