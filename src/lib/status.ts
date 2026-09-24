import type { Tone } from '../components/tone';
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
  challenged: { label: 'Challenged', tone: 'accent' },
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
