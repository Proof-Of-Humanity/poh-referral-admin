import { GraphQLClient } from 'graphql-request';

import { pohChains } from '../config/poh-chain';

const clients = pohChains.map((chain) => ({ chain, client: new GraphQLClient(chain.subgraphUrl) }));

// One request never asks for more ids than its `first` can return, so a larger set goes in chunks.
const IDS_PER_QUERY = 100;
// Scanning every referral can mean dozens of chunks; sent in waves, they do not all hit the gateway at once.
const REQUESTS_IN_FLIGHT = 6;

// The claim request deliberately does not select its claimer: a withdrawn or lost claim can belong
// to a different person than the current registration, so the stake read must only ever follow the
// registration's claimer.
const HUMANITY_PROFILES = `
  query HumanityProfiles($ids: [Bytes!]) {
    humanities(where: { id_in: $ids }, first: 100) {
      id
      pendingRevocation
      registration { expirationTime claimer { id name } }
      latestClaimRequest: requests(first: 1, orderBy: creationTime, orderDirection: desc, where: { revocation: false }) {
        status { id }
        winnerParty { id }
      }
    }
  }`;

type SubgraphHumanity = {
  id: string;
  pendingRevocation: boolean;
  registration: { expirationTime: string; claimer: { id: string; name: string | null } } | null;
  latestClaimRequest: { status: { id: string }; winnerParty: { id: string } | null }[];
};

type HumanityProfilesResponse = { humanities: SubgraphHumanity[] };

export type RegistryStatus =
  | 'verified'
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
  claimerAddress: string | null;
  name: string | null;
};

const resolveOnChain = (humanity: SubgraphHumanity, chainLabel: string, pendingRevocation: boolean) => {
  const claim = humanity.latestClaimRequest[0];
  const registration = humanity.registration;
  const expiresAt = registration ? new Date(Number(registration.expirationTime) * 1000) : null;
  const isRegistered = expiresAt !== null && expiresAt.getTime() > Date.now();
  const claimRejected = claim?.status.id === 'resolved' && claim.winnerParty?.id === 'challenger';
  const claimWon =
    (claim?.status.id === 'resolved' && claim.winnerParty?.id === 'requester') || claim?.status.id === 'transferred';

  const status = ((): RegistryStatus => {
    if (isRegistered) return pendingRevocation ? 'revocation-pending' : 'verified';
    if (claimRejected) return 'rejected';
    // After a won claim a lapsed registration entity survives while a revoked one is deleted, which
    // is the only thing that separates expired from removed without a second sub-query.
    if (claimWon && registration !== null) return pendingRevocation ? 'revocation-pending' : 'expired';
    // Without the removal request a revocation and a cross-chain transfer still in flight look the
    // same here, and both mean there is no live registration on either chain.
    if (claimWon) return 'removed';
    if (claim?.status.id === 'vouching') return 'needs-vouch';
    if (claim?.status.id === 'resolving' || claim?.status.id === 'disputed') return 'in-review';
    return 'not-registered';
  })();

  const profile: HumanityProfile = {
    status,
    chainLabel,
    expiresAt,
    claimerAddress: registration?.claimer.id ?? null,
    name: registration?.claimer.name ?? null,
  };

  // A transferred-away record is only a proxy for the destination chain, so it must never shadow it.
  const liveliness = isRegistered ? 2 : claim?.status.id === 'transferred' ? 0 : claim ? 1 : 0;

  return { profile, liveliness };
};

export const fetchHumanityProfiles = async (
  ids: string[],
  signal?: AbortSignal,
): Promise<Map<string, HumanityProfile>> => {
  // The Graph matches Bytes case-sensitively.
  const lowercased = [...new Set(ids.map((id) => id.toLowerCase()))];

  const chunks = Array.from({ length: Math.ceil(lowercased.length / IDS_PER_QUERY) }, (_, index) =>
    lowercased.slice(index * IDS_PER_QUERY, (index + 1) * IDS_PER_QUERY),
  );
  const requests = clients.flatMap(({ chain, client }) =>
    chunks.map(
      (chunk) => async () =>
        (
          await client.request<HumanityProfilesResponse>({
            document: HUMANITY_PROFILES,
            variables: { ids: chunk },
            signal,
          })
        ).humanities.map(
          (humanity) => ({ key: humanity.id.toLowerCase(), chainLabel: chain.label, humanity }),
        ),
    ),
  );

  // Nothing is caught per chain or chunk: a half-answer is indistinguishable in the UI from a full
  // one, so any failing request is shown as an error instead.
  const rows: { key: string; chainLabel: string; humanity: SubgraphHumanity }[] = [];
  for (let start = 0; start < requests.length; start += REQUESTS_IN_FLIGHT) {
    const wave = await Promise.all(requests.slice(start, start + REQUESTS_IN_FLIGHT).map((request) => request()));
    rows.push(...wave.flat());
  }

  // The payout bot ORs hasPendingRevocation across the chain set, so reading only the winning
  // chain's flag would show Verified for a party the bot refuses.
  const revoking = new Set(rows.filter(({ humanity }) => humanity.pendingRevocation).map(({ key }) => key));

  const merged = new Map<string, { profile: HumanityProfile; liveliness: number }>();
  for (const { key, chainLabel, humanity } of rows) {
    const resolved = resolveOnChain(humanity, chainLabel, revoking.has(key));
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, resolved);
      continue;
    }
    const winner = resolved.liveliness > previous.liveliness ? resolved : previous;
    const loser = winner === resolved ? previous : resolved;
    // A bridged destination registration carries no name; the source chain's still does.
    winner.profile.name ??= loser.profile.name;
    merged.set(key, winner);
  }

  return new Map([...merged].map(([key, { profile }]) => [key, profile]));
};
