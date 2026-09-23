import { useQuery } from '@tanstack/react-query';
import { readContract } from 'wagmi/actions';
import type { ReactNode } from 'react';

import { AddressChip } from '../components/address';
import { Badge } from '../components/badge';
import { ErrorState } from '../components/error-state';
import { PersonIcon } from '../components/icons';
import { Skeleton } from '../components/skeleton';
import { humanityCourt, pohChains, stakeOfAbi } from '../config/poh-chain';
import { wagmiConfig } from '../config/wagmi';
import { fetchHumanityProfiles, type HumanityProfile } from '../graphql/subgraph';
import type { ReferralFieldsFragment as Referral } from '../graphql/generated';
import { formatDateTime, formatPnk, formatRelative, shortAddress } from '../lib/format';
import { registryStatusDisplay } from '../lib/status';

export const ReferralDrawerRow = ({ referral }: { referral: Referral }) => {
  const profiles = useQuery({
    queryKey: ['poh-humanities', referral.refereeHumanityId, referral.referrerHumanityId],
    queryFn: () => fetchHumanityProfiles([referral.refereeHumanityId, referral.referrerHumanityId]),
  });

  return (
    <tr className="border-b border-line/60 last:border-b-0">
      <td colSpan={8} className="pt-2 pb-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          {profiles.isPending ? (
            // Sized to the settled panels, so the drawer opens at its final height instead of
            // shoving every row below it down when the profiles land.
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" delayMs={90} />
            </div>
          ) : profiles.error ? (
            <ErrorState error={profiles.error} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <PartyPanel
                role="Referee"
                humanityId={referral.refereeHumanityId}
                profile={profiles.data.get(referral.refereeHumanityId.toLowerCase())}
              />
              <PartyPanel
                role="Referrer"
                humanityId={referral.referrerHumanityId}
                profile={profiles.data.get(referral.referrerHumanityId.toLowerCase())}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const initials = (name: string) => {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
};

const PartyPanel = ({
  role,
  humanityId,
  profile,
}: {
  role: string;
  humanityId: string;
  profile: HumanityProfile | undefined;
}) => (
  <div className="min-h-80 rounded-xl border border-line bg-surface/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-full bg-fill text-[11.5px] font-medium text-fg-muted">
        {profile?.name ? initials(profile.name) : <PersonIcon className="size-4 text-fg-faint" />}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] text-fg" title={profile?.name ?? undefined}>
          {profile?.name ?? role}
        </div>
        <div className="text-xs text-fg-faint" title={humanityId}>
          {profile?.name ? `${role} · ` : ''}humanity {shortAddress(humanityId)}
        </div>
      </div>
    </div>
    {profile === undefined ? (
      // Missing on one chain of the pair is normal; missing on both is either a humanity that never
      // existed or a wrong chain set, and neither may be dressed up as a status.
      <div className="mt-3 text-[13px] text-fg-muted">
        No record on {pohChains.map((chain) => chain.label).join(' · ')}
      </div>
    ) : (
      <dl className="mt-3 space-y-2.5">
        <Detail label="Registry">
          <Badge tone={registryStatusDisplay[profile.status].tone}>{registryStatusDisplay[profile.status].label}</Badge>
        </Detail>
        <Detail label="Expires">
          {profile.expiresAt ? (
            <span title={formatRelative(profile.expiresAt.toISOString())}>
              {formatDateTime(profile.expiresAt.toISOString())}
            </span>
          ) : (
            '—'
          )}
        </Detail>
        <Detail label="Chain">{profile.chainLabel}</Detail>
        <Detail label="Claimer">
          {profile.claimerAddress ? (
            <AddressChip address={profile.claimerAddress} />
          ) : (
            <span className="inline-flex py-0.5 text-[12.5px] text-fg-muted">no current owner</span>
          )}
        </Detail>
        <Detail label="Stake">
          <StakeRow claimer={profile.claimerAddress} />
        </Detail>
      </dl>
    )}
  </div>
);

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase">{label}</dt>
    <dd className="mt-0.5 text-[13px] text-fg">{children}</dd>
  </div>
);

const StakeRow = ({ claimer }: { claimer: string | null }) => {
  const stake = useQuery({
    queryKey: ['poh-stake', claimer],
    enabled: Boolean(claimer),
    queryFn: () =>
      readContract(wagmiConfig, {
        chainId: humanityCourt.chainId,
        address: humanityCourt.klerosLiquid,
        abi: stakeOfAbi,
        functionName: 'stakeOf',
        args: [claimer as `0x${string}`, humanityCourt.subcourtId],
      }),
  });

  // Checked before the query state: a disabled query reports 'pending' forever in react-query v5.
  if (!claimer)
    return (
      <>
        —
        <div className="mt-1.5 h-1 rounded-full bg-fill-strong" />
      </>
    );
  if (stake.error) return <span className="text-fg-muted">unavailable</span>;
  if (stake.isPending)
    return (
      <>
        {/* As tall as the line of text it stands in for, so the panel does not grow when the read lands. */}
        <Skeleton className="h-5 w-24" />
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fill-strong" />
      </>
    );

  return (
    <>
      {formatPnk(stake.data)} of {formatPnk(humanityCourt.minStakeWei)} required
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fill-strong">
        <div
          className={`h-full rounded-full ${stake.data >= humanityCourt.minStakeWei ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `max(2px, ${Math.min(100, Number((stake.data * 100n) / humanityCourt.minStakeWei))}%)` }}
        />
      </div>
    </>
  );
};
