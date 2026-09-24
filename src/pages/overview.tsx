import { useQuery } from '@tanstack/react-query';

import { Breakdown } from '../components/breakdown';
import {
  ArrowRightIcon,
  CoinIcon,
  FlagIcon,
  LinkIcon,
  ListIcon,
  ReferralIcon,
  StarIcon,
  WarningIcon,
} from '../components/icons';
import { ErrorState } from '../components/error-state';
import { Skeleton } from '../components/skeleton';
import { PageHeader } from '../components/page-header';
import { Panel } from '../components/panel';
import { PanelLink } from '../components/panel-link';
import { Stat } from '../components/stat';
import { externalTools } from '../config/referral';
import { api } from '../graphql/client';
import { useNow } from '../lib/use-now';
import { utcDayStart, utcMonthStart } from '../lib/utc';

export const OverviewPage = () => {
  const now = useNow();
  const counts = useQuery({
    queryKey: ['referral-counts'],
    queryFn: () => api.ReferralCounts(),
  });
  // The clock ticks every minute, so the keys roll over within a minute of midnight UTC.
  const dayStart = utcDayStart(now);
  const monthStart = utcMonthStart(now);
  const activity = useQuery({
    queryKey: ['referral-counts', 'activity', dayStart, monthStart],
    queryFn: () =>
      api.ReferralActivityCounts({
        todayFrom: new Date(dayStart).toISOString(),
        monthFrom: new Date(monthStart).toISOString(),
      }),
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
        <Stat
          label="Needs review"
          value={referralCounts.needsReview.count}
          tone="accent"
          icon={WarningIcon}
          to="/referrals?reviewStatus=NeedsReview"
        />
        <Stat
          label="Flagged humanities"
          value={countOrPlaceholder(flagged)}
          tone="danger"
          icon={FlagIcon}
          to="/flags"
        />
        <Stat
          label="Cap whitelisted"
          value={countOrPlaceholder(whitelisted)}
          tone="info"
          icon={StarIcon}
          to="/whitelist"
        />
      </div>
      <SectionLabel>Activity (UTC)</SectionLabel>
      <div className={activityGridClass}>
        <Stat
          label="Created today"
          value={countOrPlaceholder({ error: activity.error, data: activity.data?.today.count })}
          tone="info"
        />
        <Stat
          label="Created this month"
          value={countOrPlaceholder({ error: activity.error, data: activity.data?.thisMonth.count })}
          tone="info"
        />
        <Stat label="Paid out" value={referralCounts.confirmed.count} tone="success" />
        <Stat label="Rejected" value={referralCounts.rejected.count} tone="danger" />
        <Stat label="Needs review" value={referralCounts.needsReview.count} tone="accent" />
      </div>
      <div className="mt-5 grid gap-2.5 lg:grid-cols-3">
        <Panel title="Review status" icon={ListIcon} actions={<PanelLink to="/referrals">View all</PanelLink>}>
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
        <Panel title="Tools" icon={LinkIcon}>
          <ul className="space-y-1">
            {externalTools.map((tool) => (
              <li key={tool.href}>
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group -mx-2 flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-fill"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-fg group-hover:text-accent">{tool.label}</span>
                    <span className="block truncate text-[12px] text-fg-muted">{tool.description}</span>
                  </span>
                  <ArrowRightIcon className="size-3.5 shrink-0 text-fg-faint group-hover:text-accent" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
};

// Five cards: two per row on phones with the fifth spanning the row, all five across at lg.
const activityGridClass =
  'grid grid-cols-2 gap-2.5 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1';

const SectionLabel = ({ children }: { children: string }) => (
  <h2 className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase">{children}</h2>
);

const countOrPlaceholder = (query: { error: unknown; data?: number }) => {
  if (query.error) return <span className="text-[15px] text-fg-faint">unavailable</span>;
  return query.data ?? <Skeleton className="h-[26px] w-10" />;
};

const StatSkeleton = ({ delayMs }: { delayMs: number }) => (
  <Panel>
    <Skeleton className="h-3 w-20" delayMs={delayMs} />
    <Skeleton className="mt-2.5 h-6 w-14" delayMs={delayMs} />
  </Panel>
);

/** Mirrors the real layout below, so the page settles in place rather than reflowing. */
const OverviewSkeleton = () => (
  <>
    <PageHeader title="Overview" subtitle="Referral pipeline at a glance." />
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, card) => (
        <StatSkeleton key={card} delayMs={card * 80} />
      ))}
    </div>
    <SectionLabel>Activity (UTC)</SectionLabel>
    <div className={activityGridClass}>
      {Array.from({ length: 5 }, (_, card) => (
        <StatSkeleton key={card} delayMs={card * 80} />
      ))}
    </div>
    <div className="mt-5 grid gap-2.5 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, panel) => (
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
