import type { QueryClient } from '@tanstack/react-query';

import { errorMessage } from '../components/error-state';
import { pohChains } from '../config/poh-chain';
import { api } from '../graphql/client';
import {
  PohReferralSortField,
  SortDirection,
  type AdminReferralFilter,
  type ReferralFieldsFragment as Referral,
} from '../graphql/generated';
import { fetchHumanityProfiles, type HumanityProfile, type RegistryStatus } from '../graphql/subgraph';

import type { FlagFilter, RegistryFilter } from './status';

// The API refuses larger pages.
const MAX_TAKE = 100;
// Registry status moves on-chain over days, so a humanity read in the last few minutes is not read
// again when the API filters around it change.
const REGISTRY_FRESH_MS = 5 * 60_000;
// Matches the app's default staleTime for Atlas reads.
const REFERRALS_FRESH_MS = 30_000;

const registryKey = (humanityId: string) => ['poh-registry', humanityId];
// Under ['referrals'], so the invalidation after a review marks it stale.
const everyReferralKey = (filter: AdminReferralFilter) => ['referrals', 'every-raw', filter];

/** Which parties' registry status a scan looked up; the other side's map entries are absent, not "no record". */
export type LookedUp = { referee: boolean; referrer: boolean };

export type ReferralScan = {
  referrals: Referral[];
  lookedUp: LookedUp;
  profiles: Map<string, HumanityProfile>;
};

/** Every referral the API filter matches, newest first, one API page at a time. */
const fetchEveryReferral = async (filter: AdminReferralFilter, signal: AbortSignal): Promise<Referral[]> => {
  // Keyed by referee, which identifies a referral: a row created mid-scan shifts the newest-first
  // pages down by one, and the row pushed across the boundary would otherwise be listed twice.
  const referrals = new Map<string, Referral>();
  let hasNextPage = true;
  let skip = 0;
  while (hasNextPage) {
    const page = await api.Referrals(
      {
        pagination: {
          skip,
          take: MAX_TAKE,
          orderBy: PohReferralSortField.CreatedAt,
          orderDirection: SortDirection.Desc,
        },
        filter,
      },
      undefined,
      signal,
    );
    const { items } = page.adminPohReferrals;
    for (const { item } of items) referrals.set(item.refereeHumanityId.toLowerCase(), item);
    skip += items.length;
    // An empty page that claims more would otherwise loop forever.
    hasNextPage = page.adminPohReferrals.hasNextPage && items.length > 0;
  }
  return [...referrals.values()];
};

/**
 * Registry profiles for these (lowercased) humanities. Each one is cached on its own, so changing
 * the API filters re-reads only humanities this tab has not resolved recently.
 */
const lookUpRegistry = async (
  queryClient: QueryClient,
  humanityIds: string[],
  signal: AbortSignal,
): Promise<Map<string, HumanityProfile>> => {
  const now = Date.now();
  const profiles = new Map<string, HumanityProfile>();
  const unread: string[] = [];
  // Read before any await: a cached entry can be garbage-collected while the unread ones load.
  for (const id of humanityIds) {
    const cached = queryClient.getQueryState<HumanityProfile | null>(registryKey(id));
    // Verified was worked out against the clock at read time, so a registration that has since
    // lapsed is read again rather than kept as verified until the cache ages out.
    const lapsed = cached?.data?.status === 'verified' && (cached.data.expiresAt?.getTime() ?? 0) <= now;
    if (cached?.data === undefined || cached.dataUpdatedAt < now - REGISTRY_FRESH_MS || lapsed) unread.push(id);
    else if (cached.data) profiles.set(id, cached.data);
  }
  if (unread.length === 0) return profiles;

  const fetched = await fetchHumanityProfiles(unread, signal);
  for (const id of unread) {
    const profile = fetched.get(id) ?? null;
    queryClient.setQueryData(registryKey(id), profile);
    if (profile) profiles.set(id, profile);
  }
  return profiles;
};

/**
 * Atlas cannot filter on registry status or flags, so those run in the browser over every referral
 * the API filter matches, with registry status looked up only for the parties a filter names.
 */
export const scanReferrals = async (
  queryClient: QueryClient,
  filter: AdminReferralFilter,
  lookedUp: LookedUp,
  signal: AbortSignal,
): Promise<ReferralScan> => {
  // Cached on the API filter alone, so naming another side for a registry lookup does not page
  // through Atlas again. Read and written by hand rather than fetched as a query of its own: this
  // scan owns the request, so cancelling it stops the paging, and a read started before a review
  // can never be joined and handed back as the result after it.
  const cached = queryClient.getQueryState<Referral[]>(everyReferralKey(filter));
  const referrals =
    cached?.data !== undefined && !cached.isInvalidated && cached.dataUpdatedAt >= Date.now() - REFERRALS_FRESH_MS
      ? cached.data
      : await fetchEveryReferral(filter, signal);
  // A scan cancelled by a review's invalidation may still have its last page in hand; that list
  // predates the review and must not be cached as fresh.
  signal.throwIfAborted();
  if (referrals !== cached?.data) queryClient.setQueryData(everyReferralKey(filter), referrals);
  const humanityIds = [
    ...new Set(
      referrals.flatMap((referral) => [
        ...(lookedUp.referee ? [referral.refereeHumanityId.toLowerCase()] : []),
        ...(lookedUp.referrer ? [referral.referrerHumanityId.toLowerCase()] : []),
      ]),
    ),
  ];
  try {
    return { referrals, lookedUp, profiles: await lookUpRegistry(queryClient, humanityIds, signal) };
  } catch (error) {
    if (signal.aborted) throw error;
    // Named, so a gateway outage does not read as Atlas being down.
    const chains = pohChains.map((chain) => chain.label).join(' and ');
    throw new Error(`Could not read registry status from ${chains}: ${errorMessage(error)}`, { cause: error });
  }
};

export type PartyFilter = { registry: RegistryFilter | ''; flag: FlagFilter | '' };

/** A party's registry status, or undefined when the scan did not look that side up. */
export const registryOf = (
  scan: ReferralScan,
  party: keyof LookedUp,
  humanityId: string,
): RegistryStatus | 'no-record' | undefined => {
  if (!scan.lookedUp[party]) return undefined;
  return scan.profiles.get(humanityId.toLowerCase())?.status ?? 'no-record';
};

const partyMatches = (
  filter: PartyFilter,
  registry: RegistryStatus | 'no-record' | undefined,
  flag: { isFlagged: boolean } | null | undefined,
) => {
  if (filter.registry === 'unverified' && registry === 'verified') return false;
  if (filter.registry !== '' && filter.registry !== 'unverified' && registry !== filter.registry) return false;
  if (filter.flag !== '' && (filter.flag === 'flagged') !== Boolean(flag?.isFlagged)) return false;
  return true;
};

export const referralMatches = (
  scan: ReferralScan,
  referral: Referral,
  referee: PartyFilter,
  referrer: PartyFilter,
) =>
  partyMatches(referee, registryOf(scan, 'referee', referral.refereeHumanityId), referral.refereeFlag) &&
  partyMatches(referrer, registryOf(scan, 'referrer', referral.referrerHumanityId), referral.referrerFlag);
