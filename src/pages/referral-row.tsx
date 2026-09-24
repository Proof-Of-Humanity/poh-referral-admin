import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AddressChip } from '../components/address';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Callout } from '../components/callout';
import { cx } from '../components/cx';
import { ErrorState, errorMessage } from '../components/error-state';
import { Field } from '../components/field';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  XIcon,
} from '../components/icons';
import { Modal } from '../components/modal';
import { Select } from '../components/select';
import { Textarea } from '../components/textarea';
import { useToast } from '../components/toast';
import { toneText, type Tone } from '../components/tone';
import { pohChains } from '../config/poh-chain';
import { HIGH_VOLUME_MONTH, MONTHLY_PAYOUT_CAP } from '../config/referral';
import { api, MAX_REASON_LENGTH } from '../graphql/client';
import {
  PohReferralReviewStatus,
  ReferralPayoutFilter,
  type ReferralFieldsFragment as Referral,
} from '../graphql/generated';
import type { HumanityProfile } from '../graphql/subgraph';
import { formatDateTime, formatPnk, formatRelative } from '../lib/format';
import { derivePayoutTiming } from '../lib/payout-timing';
import { ATLAS_REFRESH_INTERVAL_MS, countReferrals, includesHumanity, type HumanityIds } from '../lib/referral-data';
import {
  payoutStateDisplay,
  registryStatusDisplay,
  reviewStatusDisplay,
  reviewStatusOptions,
  type StatusDisplay,
} from '../lib/status';
import { utcMonthStart } from '../lib/utc';

/** The blank first heading is the drawer toggle, the blank last one the actions column. */
export const REFERRAL_COLUMNS = ['', 'Referee', 'Referrer', 'Review', 'Payout', 'Reward', 'Created', ''];

// A backend newer than the generated types may send a status these maps do not know.
const unknownStatusDisplay = (status: string): StatusDisplay => ({ label: status, tone: 'muted' });

// The bot writes machine codes into the reason field; admins write sentences.
const reviewReasonLabels: Record<string, string> = {
  MONTHLY_CAP_EXCEEDED: 'Monthly cap exceeded',
  CLAIM_REQUEST_BEFORE_REFERRAL: 'Claim predates the referral',
};

/** The slice of a TanStack query the row reads, so callers can hand over any query of that shape. */
type Lookup<T> = { data: T | undefined; error: unknown; isPending: boolean };

type HumanityProfiles = Map<string, HumanityProfile>;

export type ReferrerVolume = Record<string, number>;

const distinct = (ids: string[]) => [...new Set(ids.map((id) => id.toLowerCase()))].sort();

/**
 * How many referrals each referrer on the page created this UTC month, in one aliased request.
 * Keyed on the sorted ids so paging back to the same rows is free.
 */
export const useReferrerVolume = (referrals: Referral[]) => {
  const referrerIds = distinct(referrals.map((referral) => referral.referrerHumanityId));
  const monthStart = utcMonthStart(Date.now());
  return useQuery({
    queryKey: ['referrals', 'volume', referrerIds, monthStart],
    enabled: referrerIds.length > 0,
    refetchInterval: ATLAS_REFRESH_INTERVAL_MS,
    queryFn: (): Promise<ReferrerVolume> => {
      const createdAtFrom = new Date(monthStart).toISOString();
      return countReferrals(
        Object.fromEntries(referrerIds.map((id) => [id, { referrerHumanityId: id, createdAtFrom }])),
      );
    },
  });
};

const VOLUME_HINT =
  'Referrals created this UTC month. The payout cap counts payouts reserved this month, so this is a volume signal, not the cap counter.';

/** The window is the one check the dashboard can time; passing it is not a promise of payment. */
const safetyWindowHint = (kind: 'countdown' | 'eligible', eligibleAt: number) =>
  [
    `The safety window ${kind === 'eligible' ? 'ended' : 'ends'}`,
    `${formatDateTime(new Date(eligibleAt).toISOString())}.`,
    'The bot still checks referrer ownership and revocation, stakes, that the claim was made after the referral,',
    'and the monthly cap before it pays.',
  ].join(' ');

const NO_RECORD_HINT = `No record on ${pohChains.map((chain) => chain.label).join(' · ')}`;

/** One line above a table whose rows would otherwise each repeat that the subgraph is missing. */
export const SubgraphUnavailableNote = ({ humanities }: { humanities: Lookup<unknown> }) => {
  if (humanities.error === null) return null;
  return (
    <Callout tone="muted" className="mb-5">
      {errorMessage(humanities.error)} Payout timing that depends on it is blank.
    </Callout>
  );
};

/** Why the cap markers are missing when the whitelist could not settle whether they apply. */
const whitelistUnknownHint = (whitelist: Lookup<HumanityIds>) =>
  whitelist.error
    ? `The whitelist did not load (${errorMessage(whitelist.error)}), so whether the monthly cap applies is unknown.`
    : 'The whitelist was cut off before this humanity, so whether the monthly cap applies is unknown.';

const ReferrerVolumeLine = ({
  referrerId,
  volume,
  whitelist,
}: {
  referrerId: string;
  volume: Lookup<ReferrerVolume>;
  whitelist: Lookup<HumanityIds>;
}) => {
  if (volume.error) return <div className="mt-1 text-[11.5px] text-fg-muted">Volume unavailable</div>;
  if (!volume.data) return <div className="mt-1 text-[11.5px] text-fg-muted">…</div>;
  const id = referrerId.toLowerCase();
  const count = volume.data[id] ?? 0;
  const whitelisted = includesHumanity(whitelist.data, id);
  // Created counts are not the cap counter (that is payouts reserved), so the marker names volume
  // only, turning red at the cap's size. A whitelisted referrer has no cap to approach, so the
  // count stays but the marker goes; the same when the whitelist cannot say.
  const tone: Tone =
    whitelisted !== false || count < HIGH_VOLUME_MONTH ? 'muted' : count >= MONTHLY_PAYOUT_CAP ? 'danger' : 'accent';
  const marker = tone === 'muted' ? null : 'High volume';
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]" title={VOLUME_HINT}>
      <span className={cx('whitespace-nowrap', tone === 'muted' ? 'text-fg-muted' : toneText[tone])}>
        {count} referred this month{marker && ` · ${marker}`}
      </span>
      {whitelisted && <Badge tone="info">Whitelisted</Badge>}
      {whitelisted === undefined && !whitelist.isPending && (
        <span className="whitespace-nowrap text-fg-faint" title={whitelistUnknownHint(whitelist)}>
          · cap exemption unknown
        </span>
      )}
    </div>
  );
};

export const ReferralRow = ({
  referral,
  now,
  volume,
  whitelist,
  humanities,
  onReview,
  expanded,
  onToggle,
}: {
  referral: Referral;
  now: number;
  volume: Lookup<ReferrerVolume>;
  whitelist: Lookup<HumanityIds>;
  humanities: Lookup<HumanityProfiles>;
  onReview: (referral: Referral) => void;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const payout = referral.payoutTransaction;
  const reviewDisplay = reviewStatusDisplay[referral.reviewStatus] ?? unknownStatusDisplay(referral.reviewStatus);
  const payoutDisplay = payout
    ? (payoutStateDisplay[ReferralPayoutFilter[payout.status]] ?? unknownStatusDisplay(payout.status))
    : payoutStateDisplay.Unassigned;
  const reason = referral.reviewReason;

  // A failed refresh keeps the last answer in `data`; showing it as current would be a guess.
  const lookupFailed = humanities.error !== null;
  const refereeKnown = !lookupFailed && humanities.data !== undefined;
  const referee = refereeKnown ? humanities.data?.get(referral.refereeHumanityId.toLowerCase()) : undefined;
  const timing = derivePayoutTiming(referral, referee, now);
  // Only the blocked kind is read off the referee; the rest come from Atlas and show without the subgraph.
  const timingUnknown = timing?.kind === 'blocked' && !refereeKnown;
  const unavailableHint = lookupFailed ? errorMessage(humanities.error) : undefined;

  return (
    // An open row hands its bottom border to the drawer row below it, which keeps the drawer attached to
    // its own row and preserves the last:border-b-0 look the inserted drawer would otherwise defeat.
    <tr className={cx('align-top', !expanded && 'border-b border-line/60 last:border-b-0')}>
      <td className="py-3 pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide on-chain detail' : 'Show on-chain detail'}
          // Grows into the row, never past the table's left edge: the scroll container clips anything there.
          className="-my-1 -mr-1 rounded-md p-1 text-fg-faint transition-colors hover:bg-fill hover:text-accent"
        >
          {expanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        </button>
      </td>
      <td className="py-3 pr-3">
        <AddressChip address={referral.refereeHumanityId} />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {referral.refereeFlag?.isFlagged && <Badge tone="danger">Flagged</Badge>}
          {referee ? (
            <Badge tone={registryStatusDisplay[referee.status].tone}>{registryStatusDisplay[referee.status].label}</Badge>
          ) : refereeKnown ? (
            // Missing on every chain is either a humanity that never existed or a wrong chain set,
            // and neither may be dressed up as a status.
            <span className="text-[11.5px] text-fg-muted" title={NO_RECORD_HINT}>
              No record
            </span>
          ) : (
            <span className="text-[11.5px] text-fg-muted" title={unavailableHint}>
              {lookupFailed ? 'PoH –' : '…'}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-3">
        <AddressChip address={referral.referrerHumanityId} />
        {referral.referrerFlag?.isFlagged && (
          <div className="mt-1">
            <Badge tone="danger">Flagged</Badge>
          </div>
        )}
        <ReferrerVolumeLine referrerId={referral.referrerHumanityId} volume={volume} whitelist={whitelist} />
      </td>
      <td className="py-3 pr-3">
        <Badge tone={reviewDisplay.tone}>{reviewDisplay.label}</Badge>
        {reason && (
          <div className="mt-1 line-clamp-2 max-w-52 text-xs text-fg-faint" title={reason}>
            {reviewReasonLabels[reason] ?? reason}
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <Badge tone={payoutDisplay.tone}>{payoutDisplay.label}</Badge>
        {payout?.txHash && (
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-fg-faint" title={payout.txHash}>
            <LinkIcon className="size-3.5 shrink-0" />
            {payout.txHash.slice(0, 10)}…
          </div>
        )}
        {timing && !timingUnknown && (
          <div
            className={cx(
              'mt-1 text-[11.5px] whitespace-nowrap',
              timing.tone === 'muted' ? 'text-fg-muted' : toneText[timing.tone],
            )}
            title={'eligibleAt' in timing ? safetyWindowHint(timing.kind, timing.eligibleAt) : undefined}
          >
            {timing.label}
          </div>
        )}
        {timingUnknown && (
          <div className="mt-1 text-[11.5px] text-fg-muted" title={unavailableHint}>
            {lookupFailed ? 'Timing –' : '…'}
          </div>
        )}
      </td>
      <td className="py-3 pr-3 font-mono whitespace-nowrap text-fg">{formatPnk(referral.rewardAmount)}</td>
      <td className="py-3 pr-3 whitespace-nowrap text-fg-muted" title={formatDateTime(referral.createdAt)}>
        <span className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5 shrink-0 text-fg-faint" />
          {formatRelative(referral.createdAt)}
        </span>
      </td>
      <td className="py-3 text-right">
        <Button
          onClick={() => onReview(referral)}
          disabled={Boolean(payout)}
          title={payout ? 'Locked: a payout is already assigned' : undefined}
        >
          {payout ? <LockIcon className="size-3.5" /> : <ListIcon className="size-3.5" />}
          Review
        </Button>
      </td>
    </tr>
  );
};

// Spelled out where the choice is made: Approved in particular is an override, not a tidier Active.
const reviewStatusEffect: Record<PohReferralReviewStatus, string> = {
  [PohReferralReviewStatus.Active]:
    'Pays no sooner than 2 days after the referee verified, if every other check passes.',
  [PohReferralReviewStatus.NeedsReview]: 'Parks the referral. The bot skips it until someone changes this.',
  [PohReferralReviewStatus.Approved]:
    'Overrides the 30-day expiry and the monthly cap. Pays even if the referrer is over their limit.',
  [PohReferralReviewStatus.Rejected]: 'Never paid. Reversible until a payout is reserved.',
};

// The two outcomes that move money or refuse it get a box, not a hint line.
const reviewStatusWarning: Partial<Record<PohReferralReviewStatus, { tone: Tone; text: string }>> = {
  [PohReferralReviewStatus.Approved]: {
    tone: 'accent',
    text: 'Approved pays past the 30-day expiry and over the monthly cap, whitelist or not. Use it to rescue a legitimate referral, not to clear a queue.',
  },
  [PohReferralReviewStatus.Rejected]: {
    tone: 'danger',
    text: 'Rejected is never paid. You can undo it until the payout bot reserves the referral, after which no status change is accepted.',
  },
};

export const ReviewModal = ({ referral, onClose }: { referral: Referral; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reviewStatus, setReviewStatus] = useState(referral.reviewStatus);
  const [reason, setReason] = useState('');
  const warning = reviewStatusWarning[reviewStatus];

  const update = useMutation({
    mutationFn: () => api.UpdateReviewStatus({ refereeHumanityId: referral.refereeHumanityId, reviewStatus, reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['referrals'] }),
        queryClient.invalidateQueries({ queryKey: ['referral-counts'] }),
      ]);
      toast(`Referral marked ${reviewStatusDisplay[reviewStatus].label}`);
      onClose();
    },
  });
  return (
    // Locked once something is typed, so a stray click on the backdrop cannot bin the reason.
    <Modal title="Update review status" onClose={onClose} locked={update.isPending || reason.trim() !== ''}>
      <div className="mb-4 grid grid-cols-2 gap-3 font-mono text-xs">
        <div>
          <div className="text-fg-faint">Referee</div>
          <AddressChip address={referral.refereeHumanityId} />
        </div>
        <div>
          <div className="text-fg-faint">Referrer</div>
          <AddressChip address={referral.referrerHumanityId} />
        </div>
      </div>
      <div className="space-y-4">
        {/* The boxed warning says everything the hint would, so only one of them shows. */}
        <Field label="Status" hint={warning ? undefined : reviewStatusEffect[reviewStatus]}>
          <Select
            value={reviewStatus}
            onChange={(event) => setReviewStatus(event.target.value as PohReferralReviewStatus)}
          >
            {reviewStatusOptions.map((status) => (
              <option key={status} value={status}>
                {reviewStatusDisplay[status].label}
              </option>
            ))}
          </Select>
        </Field>
        {warning && <Callout tone={warning.tone}>{warning.text}</Callout>}
        <Field
          label="Reason"
          hint="Required. Replaces the current note — there is no history, and the payout bot can overwrite it."
        >
          <Textarea
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why this decision was made"
          />
        </Field>
        {update.error && <ErrorState error={update.error} />}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={update.isPending}>
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            variant={reviewStatus === PohReferralReviewStatus.Rejected ? 'danger' : 'primary'}
            disabled={!reason.trim() || update.isPending}
            onClick={() => update.mutate()}
          >
            <CheckIcon className="size-3.5" />
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
