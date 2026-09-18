import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { CoinIcon, FlagIcon, ListIcon, ReferralIcon, StarIcon, WarningIcon } from '../components/icons';
import { ErrorState } from '../components/error-state';
import { Skeleton } from '../components/skeleton';
import { PageHeader } from '../components/page-header';
import { Panel } from '../components/panel';
import { Stat } from '../components/stat';
import type { Tone } from '../components/tone';
import { api } from '../graphql/client';

export const OverviewPage = () => {
  const counts = useQuery({
    queryKey: ['referral-counts'],
    queryFn: () => api.ReferralCounts(),
  });
  const flagged = useQuery({
    queryKey: ['flagged', 'count'],
    queryFn: () => api.FlaggedHumanities({ pagination: { take: 1 } }),
    select: (data) => data.adminPohFlaggedHumanities.count,
  });
  const whitelisted = useQuery({
    queryKey: ['whitelisted', 'count'],
    queryFn: () => api.WhitelistedHumanities({ pagination: { take: 1 } }),
    select: (data) => data.adminPohWhitelistedHumanities.count,
  });

  if (counts.isPending) return <OverviewSkeleton />;
  if (counts.error) return <ErrorState error={counts.error} />;
  const referralCounts = counts.data;

  return (
    <>
      <PageHeader title="Overview" subtitle="Referral pipeline at a glance." />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Referrals" value={referralCounts.total.count} tone="muted" icon={ReferralIcon} />
        <Stat label="Needs review" value={referralCounts.needsReview.count} tone="accent" icon={WarningIcon} />
        <Stat label="Flagged humanities" value={countOrPlaceholder(flagged)} tone="danger" icon={FlagIcon} />
        <Stat label="Cap whitelisted" value={countOrPlaceholder(whitelisted)} tone="info" icon={StarIcon} />
      </div>
      <div className="mt-5 grid gap-2.5 lg:grid-cols-2">
        <Panel
          title="Review status"
          icon={ListIcon}
          actions={
            <Link
              to="/referrals"
              className="rounded-full bg-fill px-2.5 py-0.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg"
            >
              Open
            </Link>
          }
        >
          <Breakdown
            rows={[
              ['Active', referralCounts.active.count, 'info'],
              ['Needs review', referralCounts.needsReview.count, 'accent'],
              ['Approved', referralCounts.approved.count, 'success'],
              ['Rejected', referralCounts.rejected.count, 'danger'],
            ]}
            total={referralCounts.total.count}
          />
        </Panel>
        <Panel title="Payout status" icon={CoinIcon}>
          <Breakdown
            rows={[
              ['Unassigned', referralCounts.unassigned.count, 'muted'],
              ['Not sent', referralCounts.notSent.count, 'accent'],
              ['Pending', referralCounts.pending.count, 'info'],
              ['Confirmed', referralCounts.confirmed.count, 'success'],
            ]}
            total={referralCounts.total.count}
          />
        </Panel>
      </div>
    </>
  );
};

const countOrPlaceholder = (query: { error: unknown; data?: number }) => {
  if (query.error) return <span className="text-[15px] text-fg-faint">unavailable</span>;
  return query.data ?? <Skeleton className="mt-1 h-5 w-10" />;
};

/** Mirrors the real layout below, so the page settles in place rather than reflowing. */
const OverviewSkeleton = () => (
  <>
    <PageHeader title="Overview" subtitle="Referral pipeline at a glance." />
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, card) => (
        <Panel key={card}>
          <Skeleton className="h-3 w-20" delayMs={card * 80} />
          <Skeleton className="mt-2.5 h-6 w-14" delayMs={card * 80} />
        </Panel>
      ))}
    </div>
    <div className="mt-5 grid gap-2.5 lg:grid-cols-2">
      {Array.from({ length: 2 }, (_, panel) => (
        <Panel key={panel}>
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
        </Panel>
      ))}
    </div>
  </>
);

const barColors: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-fg-faint',
};

const Breakdown = ({ rows, total }: { rows: [label: string, value: number, tone: Tone][]; total: number }) => (
  <ul className="space-y-3">
    {rows.map(([label, value, tone]) => (
      <li key={label}>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-fg-muted">{label}</span>
          <span className="text-fg">{value}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full ${barColors[tone]}`}
            style={{ width: total ? `max(2px, ${(value / total) * 100}%)` : 0 }}
          />
        </div>
      </li>
    ))}
  </ul>
);
