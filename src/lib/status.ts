import type { Tone } from '../components/tone';
import { pohChains } from '../config/poh-chain';
import { PohReferralReviewStatus, ReferralPayoutFilter } from '../graphql/generated';
import type { RegistryStatus } from '../graphql/subgraph';

export type StatusDisplay = { label: string; tone: Tone };

export const reviewStatusDisplay: Record<PohReferralReviewStatus, StatusDisplay> = {
  [PohReferralReviewStatus.Active]: { label: 'Active', tone: 'info' },
  [PohReferralReviewStatus.NeedsReview]: { label: 'Needs review', tone: 'accent' },
  [PohReferralReviewStatus.Approved]: { label: 'Approved', tone: 'success' },
  [PohReferralReviewStatus.Rejected]: { label: 'Rejected', tone: 'danger' },
};

export const payoutStateDisplay: Record<ReferralPayoutFilter, StatusDisplay> = {
  [ReferralPayoutFilter.Unassigned]: { label: 'Unassigned', tone: 'muted' },
  [ReferralPayoutFilter.NotSent]: { label: 'Not sent', tone: 'accent' },
  [ReferralPayoutFilter.Pending]: { label: 'Pending', tone: 'info' },
  [ReferralPayoutFilter.Confirmed]: { label: 'Confirmed', tone: 'success' },
};

// Only `verified` is green, because only `verified` clears the payout bot's ownership gate
export const registryStatusDisplay: Record<RegistryStatus, StatusDisplay> = {
  verified: { label: 'Verified human', tone: 'success' },
  'revocation-pending': { label: 'Revocation pending', tone: 'danger' },
  expired: { label: 'Registration expired', tone: 'accent' },
  removed: { label: 'Removed from registry', tone: 'danger' },
  rejected: { label: 'Claim rejected', tone: 'danger' },
  'in-review': { label: 'In review', tone: 'info' },
  'needs-vouch': { label: 'Needs vouch', tone: 'accent' },
  'not-registered': { label: 'Not registered', tone: 'muted' },
};

export const reviewStatusOptions = Object.values(PohReferralReviewStatus);
export const payoutFilterOptions = Object.values(ReferralPayoutFilter);

/** What a registry lookup finds for a humanity: its status, or nothing on any of the environment's subgraphs. */
export type RegistryLookup = RegistryStatus | 'no-record';

/**
 * What a registry filter can ask for: a lookup result, or any status but `verified` (the only one
 * the payout bot accepts).
 */
export type RegistryFilter = RegistryLookup | 'unverified';

export const registryFilterOptions: readonly RegistryFilter[] = [
  ...(Object.keys(registryStatusDisplay) as RegistryStatus[]),
  'unverified',
  'no-record',
];

// A humanity on none of the subgraphs has no status to show, which a row must not dress up as one.
export const noRecordDisplay: StatusDisplay = {
  label: `No record on ${pohChains.map((chain) => chain.label).join(' or ')}`,
  tone: 'muted',
};

/** Short enough for a table cell; the full label goes in its tooltip. */
export const registryStatusBrief: Record<RegistryLookup, string> = {
  verified: 'Verified',
  'revocation-pending': 'Revoking',
  expired: 'Expired',
  removed: 'Removed',
  rejected: 'Rejected',
  'in-review': 'In review',
  'needs-vouch': 'Needs vouch',
  'not-registered': 'Not registered',
  'no-record': 'No record',
};

export const flagFilterOptions = ['flagged', 'unflagged'] as const;
export type FlagFilter = (typeof flagFilterOptions)[number];
