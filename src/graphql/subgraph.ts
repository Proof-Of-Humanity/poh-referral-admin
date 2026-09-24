import { useQuery } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';

import { pohChains } from '../config/poh-chain';
import { SUBGRAPH_DOWN_HINT } from '../config/referral';

const clients = pohChains.map((chain) => ({ chain, client: new GraphQLClient(chain.subgraphUrl) }));

// Sized so one page of referees fits a single request per chain; larger sets are chunked.
const IDS_PER_QUERY = 100;
// The subgraph's own page limit. A chunk that fills it may be hiding more.
const CHALLENGES_PER_QUERY = 1000;

// The claim request deliberately does not select its claimer: a withdrawn or lost claim can belong
// to a different person than the current registration, so the stake read must only ever follow the
// registration's claimer.
//
// The verification time is what the payout bot reads (REFERRAL_PAYOUT_HUMANITIES_QUERY in Atlas):
// the resolution of the latest claim or renewal the requester won. The bot checks more than this
// before paying (stake, ownership, the claim postdating the referral), so a humanity that reads as
// eligible here can still be skipped by it.
//
// Challenges filed as sybil attack or identity theft are counted per humanity as a duplicate-account
// signal, whatever their outcome.
const HUMANITY_PROFILES = `
  query HumanityProfiles($ids: [Bytes!], $first: Int!, $challenges: Int!) {
    humanities(where: { id_in: $ids }, first: $first) {
      id
      pendingRevocation
      registration { expirationTime claimer { id name } }
      latestClaimRequest: requests(first: 1, orderBy: creationTime, orderDirection: desc, where: { revocation: false }) {
        status { id }
        winnerParty { id }
        nbChallenges
      }
      latestVerification: requests(
        first: 1
        orderBy: resolutionTime
        orderDirection: desc
        where: { revocation: false, status_: { id: "resolved" }, winnerParty_: { id: "requester" } }
      ) {
        resolutionTime
      }
    }
    duplicateChallenges: challenges(
      first: $challenges
      where: { request_: { humanity_in: $ids }, reason_in: ["sybilAttack", "identityTheft"] }
    ) {
      request { humanity { id } }
    }
  }`;

type SubgraphHumanity = {
  id: string;
  pendingRevocation: boolean;
  registration: { expirationTime: string; claimer: { id: string; name: string | null } } | null;
  latestClaimRequest: { status: { id: string }; winnerParty: { id: string } | null; nbChallenges: string }[];
  latestVerification: { resolutionTime: string }[];
};

type HumanityProfilesResponse = {
  humanities: SubgraphHumanity[];
  duplicateChallenges: { request: { humanity: { id: string } } }[];
};

/** Challenges filed as sybil attack or identity theft. `truncated` means the count is a floor. */
type DuplicateChallenges = { count: number; truncated: boolean };

export type RegistryStatus =
  | 'verified'
  | 'challenged'
  | 'revocation-pending'
  | 'expired'
  | 'removed'
  | 'rejected'
  | 'in-review'
  | 'needs-vouch'
  | 'not-registered';

export type HumanityProfile = {
  status: RegistryStatus;
  chainLabel: string;
  expiresAt: Date | null;
  /** When the humanity was last verified, which is where the payout bot's clock starts. Null when never. */
  verifiedAt: Date | null;
  claimerAddress: string | null;
  name: string | null;
  /** A duplicate-account signal, not a verdict: the challenges may have failed. */
  duplicateChallenges: DuplicateChallenges;
};

/** What one chain says about one humanity. */
type ChainRecord = { chainLabel: string; humanity: SubgraphHumanity; duplicateChallenges: DuplicateChallenges };

const seconds = (value: string) => new Date(Number(value) * 1000);

const resolveOnChain = ({ humanity, chainLabel, duplicateChallenges }: ChainRecord, pendingRevocation: boolean) => {
  const claim = humanity.latestClaimRequest[0];
  const registration = humanity.registration;
  const expiresAt = registration ? seconds(registration.expirationTime) : null;
  const isRegistered = expiresAt !== null && expiresAt.getTime() > Date.now();
  const claimRejected = claim?.status.id === 'resolved' && claim.winnerParty?.id === 'challenger';
  const claimWon =
    (claim?.status.id === 'resolved' && claim.winnerParty?.id === 'requester') || claim?.status.id === 'transferred';
  // In dispute now, or challenged and neither resolved nor withdrawn since.
  const claimChallenged =
    claim !== undefined &&
    (claim.status.id === 'disputed' ||
      (Number(claim.nbChallenges) > 0 && !['resolved', 'withdrawn'].includes(claim.status.id)));

  const status = ((): RegistryStatus => {
    if (isRegistered && pendingRevocation) return 'revocation-pending';
    // A challenged renewal leaves the registration live, so the payout bot still pays on it; the
    // badge says the dispute is open so a contested human is not read as settled.
    if (claimChallenged) return 'challenged';
    if (isRegistered) return 'verified';
    if (claimRejected) return 'rejected';
    // After a won claim a lapsed registration entity survives while a revoked one is deleted, which
    // is the only thing that separates expired from removed without a second sub-query.
    if (claimWon && registration !== null) return pendingRevocation ? 'revocation-pending' : 'expired';
    // Without the removal request a revocation and a cross-chain transfer still in flight look the
    // same here, and both mean there is no live registration on either chain.
    if (claimWon) return 'removed';
    if (claim?.status.id === 'vouching') return 'needs-vouch';
    if (claim?.status.id === 'resolving') return 'in-review';
    return 'not-registered';
  })();

  const verification = humanity.latestVerification[0];
  const profile: HumanityProfile = {
    status,
    chainLabel,
    expiresAt,
    verifiedAt: verification ? seconds(verification.resolutionTime) : null,
    claimerAddress: registration?.claimer.id ?? null,
    name: registration?.claimer.name ?? null,
    duplicateChallenges,
  };

  // A transferred-away record is only a proxy for the destination chain, so it must never shadow it.
  const liveliness = isRegistered ? 2 : claim?.status.id === 'transferred' ? 0 : claim ? 1 : 0;

  return { profile, liveliness };
};

const later = (a: Date | null, b: Date | null) => (a && b ? (a > b ? a : b) : (a ?? b));

/**
 * Folds every chain's record of a humanity into one profile, keyed by lowercased id. Exported so
 * the status rules can be exercised without a subgraph.
 */
export const mergeHumanityProfiles = (rows: ChainRecord[]): Map<string, HumanityProfile> => {
  const keyed = rows.map((row) => ({ ...row, key: row.humanity.id.toLowerCase() }));

  // The payout bot ORs hasPendingRevocation across the chain set, so reading only the winning
  // chain's flag would show Verified for a party the bot refuses.
  const revoking = new Set(keyed.filter(({ humanity }) => humanity.pendingRevocation).map(({ key }) => key));

  const merged = new Map<string, { profile: HumanityProfile; liveliness: number }>();
  for (const { key, ...record } of keyed) {
    const resolved = resolveOnChain(record, revoking.has(key));
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, resolved);
      continue;
    }
    const winner = resolved.liveliness > previous.liveliness ? resolved : previous;
    const loser = winner === resolved ? previous : resolved;
    // A bridged destination registration carries no name; the source chain's still does.
    winner.profile.name ??= loser.profile.name;
    // The verifying request can sit on the chain the humanity left, and the bot takes the most
    // recent resolution it sees across the set.
    winner.profile.verifiedAt = later(winner.profile.verifiedAt, loser.profile.verifiedAt);
    // A challenge on the chain the humanity left is still a challenge against the same person.
    winner.profile.duplicateChallenges = {
      count: winner.profile.duplicateChallenges.count + loser.profile.duplicateChallenges.count,
      truncated: winner.profile.duplicateChallenges.truncated || loser.profile.duplicateChallenges.truncated,
    };
    merged.set(key, winner);
  }

  return new Map([...merged].map(([key, { profile }]) => [key, profile]));
};

/** One request per chain per chunk of ids; ids no chain knows are absent from the map. */
export const fetchHumanityProfiles = async (ids: string[]): Promise<Map<string, HumanityProfile>> => {
  // The Graph matches Bytes case-sensitively.
  const lowercased = [...new Set(ids.map((id) => id.toLowerCase()))];
  const chunks: string[][] = [];
  for (let start = 0; start < lowercased.length; start += IDS_PER_QUERY)
    chunks.push(lowercased.slice(start, start + IDS_PER_QUERY));

  // Nothing is swallowed per chain: a half-answer is indistinguishable in the UI from a full one,
  // so a failing chain fails the lookup. A gateway failure arrives as the whole request and
  // response serialised into the message, which is no use on screen; the cause keeps it for the
  // console.
  const responses = await Promise.all(
    chunks.flatMap((chunk) =>
      clients.map(async ({ chain, client }) => ({
        chain,
        data: await client
          .request<HumanityProfilesResponse>(HUMANITY_PROFILES, {
            ids: chunk,
            first: chunk.length,
            challenges: CHALLENGES_PER_QUERY,
          })
          .catch((cause: unknown) => {
            throw new Error(SUBGRAPH_DOWN_HINT, { cause });
          }),
      })),
    ),
  );

  return mergeHumanityProfiles(
    responses.flatMap(({ chain, data }) => {
      const truncated = data.duplicateChallenges.length === CHALLENGES_PER_QUERY;
      const counts = new Map<string, number>();
      for (const challenge of data.duplicateChallenges) {
        const key = challenge.request.humanity.id.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return data.humanities.map((humanity) => ({
        chainLabel: chain.label,
        humanity,
        duplicateChallenges: { count: counts.get(humanity.id.toLowerCase()) ?? 0, truncated },
      }));
    }),
  );
};

// Verifications, revocations and registration expiries land on-chain at their own pace; this is
// how long a page left open can lag behind them.
const REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * The profiles of a set of humanities, keyed on the sorted ids so a re-render with the same rows
 * does not refetch. The status is settled at fetch time and refreshed on an interval, so a
 * registration running out shows within minutes.
 */
export const useHumanityProfiles = (humanityIds: string[]) => {
  const ids = [...new Set(humanityIds.map((id) => id.toLowerCase()))].sort();
  return useQuery({
    queryKey: ['poh-humanities', ids],
    enabled: ids.length > 0,
    refetchInterval: REFRESH_INTERVAL_MS,
    queryFn: () => fetchHumanityProfiles(ids),
  });
};
