import type { Tone } from '../components/tone';
import { PAYOUT_SAFETY_WINDOW_MS, REFERRAL_EXPIRY_MS } from '../config/referral';
import { PohReferralReviewStatus, type ReferralFieldsFragment as Referral } from '../graphql/generated';
import type { HumanityProfile } from '../graphql/subgraph';

import { formatRemaining } from './utc';

export type PayoutTiming =
  | { kind: 'reserved'; label: string; tone: Tone }
  | { kind: 'paused'; label: string; tone: Tone }
  | { kind: 'blocked'; label: string; tone: Tone }
  | { kind: 'expired'; label: string; tone: Tone }
  | { kind: 'countdown'; label: string; tone: Tone; eligibleAt: number }
  | { kind: 'eligible'; label: string; tone: Tone; eligibleAt: number };

const countdownTone = (remainingMs: number): Tone => {
  if (remainingMs >= 24 * 60 * 60 * 1000) return 'success';
  if (remainingMs >= 12 * 60 * 60 * 1000) return 'info';
  if (remainingMs >= 3 * 60 * 60 * 1000) return 'accent';
  return 'danger';
};

/**
 * Where one referral stands against the payout bot's clock. Null means there is nothing to say
 * (a rejected referral). The blocked kind is the only one that needs the referee, so with the
 * subgraph unavailable the caller shows that case as unknown rather than guessing.
 */
export const derivePayoutTiming = (
  referral: Referral,
  referee: HumanityProfile | undefined,
  now: number,
): PayoutTiming | null => {
  // Once a payout is reserved the referral is immutable and admins can no longer stop it.
  if (referral.payoutTransaction) return { kind: 'reserved', label: 'Payout reserved', tone: 'muted' };
  if (referral.reviewStatus === PohReferralReviewStatus.Rejected) return null;
  // The Needs review badge already says it; a muted line keeps the column from repeating it in orange.
  if (referral.reviewStatus === PohReferralReviewStatus.NeedsReview)
    return { kind: 'paused', label: 'Paused for review', tone: 'muted' };
  // Approved skips the 30-day expiry; everything else the bot can no longer pick up after it.
  const expiresAt = new Date(referral.createdAt).getTime() + REFERRAL_EXPIRY_MS;
  if (referral.reviewStatus !== PohReferralReviewStatus.Approved && now >= expiresAt)
    return { kind: 'expired', label: 'Expired', tone: 'danger' };
  // A flag on either side takes the referral out of the bot's candidate set until it is lifted.
  if (referral.refereeFlag?.isFlagged || referral.referrerFlag?.isFlagged)
    return { kind: 'paused', label: 'Paused: flagged', tone: 'muted' };

  if (referee?.status === 'revocation-pending')
    return { kind: 'blocked', label: 'Blocked: revocation pending', tone: 'danger' };
  // The bot pays on a live registration and the verification time alone: a challenged renewal
  // shows in the badge but does not stop the clock, and no record anywhere means not verified.
  const registered = referee?.expiresAt != null && referee.expiresAt.getTime() > now;
  if (!registered || !referee?.verifiedAt)
    return { kind: 'blocked', label: 'Awaiting verification', tone: 'muted' };

  const eligibleAt = referee.verifiedAt.getTime() + PAYOUT_SAFETY_WINDOW_MS;
  if (now < eligibleAt) {
    const remaining = eligibleAt - now;
    return {
      kind: 'countdown',
      label: `${formatRemaining(remaining)} until payout eligibility`,
      tone: countdownTone(remaining),
      eligibleAt,
    };
  }
  // Past the point where a countdown would be red: the next bot run can take it out of admin hands.
  // Only the safety window is known here; the bot's other checks may still skip it.
  return { kind: 'eligible', label: 'Safety window passed', tone: 'danger', eligibleAt };
};
