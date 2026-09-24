import { useQuery } from '@tanstack/react-query';

import { api, requestDocument } from '../graphql/client';
import {
  AdminHumanitySortField,
  SortDirection,
  type AdminHumanityPaginationInput,
  type AdminReferralFilter,
} from '../graphql/generated';

// Atlas caps query complexity at 100 per request, counting one per field. An aliased count costs
// two (the alias and `count`), so this leaves headroom for the operation wrapper.
const COUNTS_PER_REQUEST = 40;
// Focus refetches are off app-wide, so a page left open next to a ticking countdown would keep
// showing what Atlas said when it loaded. The bot reserves payouts hourly; a minute keeps a
// "Payout reserved" or a new referral from lagging far behind a clock that reads as live.
export const ATLAS_REFRESH_INTERVAL_MS = 60_000;
// The API refuses larger pages.
const MAX_TAKE = 100;

/**
 * Several filtered counts in as few requests as the complexity cap allows. Aliases are chosen by
 * the caller and returned as the keys; the filter is inlined as JSON variables, one per alias.
 */
export const countReferrals = async <Alias extends string>(
  counts: Record<Alias, AdminReferralFilter>,
): Promise<Record<Alias, number>> => {
  const entries = Object.entries(counts) as [Alias, AdminReferralFilter][];
  const result = {} as Record<Alias, number>;
  for (let start = 0; start < entries.length; start += COUNTS_PER_REQUEST) {
    const chunk = entries.slice(start, start + COUNTS_PER_REQUEST);
    const document = `query Counts(${chunk.map((_, index) => `$f${index}: AdminReferralFilter`).join(', ')}) {
      ${chunk
        .map((_, index) => `c${index}: adminPohReferrals(pagination: { take: 1 }, filter: $f${index}) { count }`)
        .join('\n')}
    }`;
    const variables = Object.fromEntries(chunk.map(([, filter], index) => [`f${index}`, filter]));
    const page = await requestDocument<Record<string, { count: number }>>(document, variables);
    chunk.forEach(([alias], index) => {
      const count = page[`c${index}`]?.count;
      // A missing alias is a broken response, and the query should fail rather than show a zero.
      if (count === undefined) throw new Error(`Count for ${alias} missing from the response`);
      result[alias] = count;
    });
  }
  return result;
};

export type HumanityIds = { ids: Set<string>; truncated: boolean };

type HumanityPage = { hasNextPage: boolean; items: { item: { humanityId: string } }[] };

/** Every humanity id in one of the admin lists, lowercased for lookups against referral rows. */
const fetchHumanityIds = async (
  list: (pagination: AdminHumanityPaginationInput) => Promise<HumanityPage>,
  limit: number,
): Promise<HumanityIds> => {
  const ids = new Set<string>();
  let hasNextPage = true;
  while (hasNextPage && ids.size < limit) {
    const page = await list({
      skip: ids.size,
      take: Math.min(MAX_TAKE, limit - ids.size),
      orderBy: AdminHumanitySortField.UpdatedAt,
      orderDirection: SortDirection.Desc,
    });
    for (const { item } of page.items) ids.add(item.humanityId.toLowerCase());
    hasNextPage = page.hasNextPage;
  }
  return { ids, truncated: hasNextPage };
};

export const fetchWhitelistedIds = (limit: number) =>
  fetchHumanityIds(
    (pagination) => api.WhitelistedHumanities({ pagination }).then((data) => data.adminPohWhitelistedHumanities),
    limit,
  );

// Past this many entries the list is a floor and a lookup miss says nothing.
const LIST_FETCH_LIMIT = 1000;

/**
 * One whitelist fetch shared by every page that marks referrers, under the key the whitelist
 * mutation invalidates. Undefined means unknown: still loading, failed, or possibly cut off.
 */
export const useWhitelistedIds = () =>
  useQuery({
    queryKey: ['whitelisted', 'ids'],
    queryFn: () => fetchWhitelistedIds(LIST_FETCH_LIMIT),
  });

/** True or false when the list settles it; undefined while unknown, or cut off before this id. */
export const includesHumanity = (list: HumanityIds | undefined, humanityId: string): boolean | undefined => {
  if (!list) return undefined;
  if (list.ids.has(humanityId.toLowerCase())) return true;
  return list.truncated ? undefined : false;
};
