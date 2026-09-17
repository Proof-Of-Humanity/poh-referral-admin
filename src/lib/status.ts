import type { Tone } from '../components/tone';
import { PohReferralReviewStatus, ReferralPayoutFilter } from '../graphql/generated';

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

export const reviewStatusOptions = Object.values(PohReferralReviewStatus);
export const payoutFilterOptions = Object.values(ReferralPayoutFilter);
