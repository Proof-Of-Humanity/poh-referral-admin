import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowRightIcon,
  BoltIcon,
  ClockIcon,
  CoinIcon,
  FlagIcon,
  ListIcon,
  StarIcon,
  type IconComponent,
} from './icons';
import { Badge } from './badge';
import { Button } from './button';
import { Modal } from './modal';
import type { Tone } from './tone';

const SEEN_KEY = 'poh-admin-tutorial-seen';

export const tutorialSeen = {
  get: () => localStorage.getItem(SEEN_KEY) === '1',
  set: () => localStorage.setItem(SEEN_KEY, '1'),
};

type Step = {
  title: string;
  icon: IconComponent;
  body: ReactNode;
  link?: { to: string; label: string };
};

const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className="mx-0.5 -my-0.5 inline-block align-middle">
    <Badge tone={tone}>{children}</Badge>
  </span>
);

const Rule = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2">
    <span className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-accent" />
    <span>{children}</span>
  </li>
);

const Row = ({ tone, label, children }: { tone: Tone; label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_1fr] gap-3">
    <dt>
      <Badge tone={tone}>{label}</Badge>
    </dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

/**
 * The referrer reads a plain-language version of every decision made here, in their own dashboard.
 * Quoting it verbatim is the quickest way to judge whether a decision will land the way you meant.
 */
const TheyRead = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-l-2 border-line-strong pl-3 text-[13px] text-fg-muted italic">They read: “{children}”</p>
);

const steps: Step[] = [
  {
    title: 'What a referral is',
    icon: BoltIcon,
    body: (
      <>
        <p>
          Someone shared an invite link, a new human joined through it and got verified. That pair — the{' '}
          <strong>referrer</strong> who invited and the <strong>referee</strong> who joined — is one referral, worth a
          PNK reward to the referrer. The amount is fixed per referral and shown in the Reward column.
        </p>
        <p className="mt-3">
          A bot pays them automatically, <strong>once an hour</strong>, with no human in the loop. Nobody approves
          payouts here. Your job is the opposite: stop the ones that should not be paid, before the bot gets to them.
        </p>
        <p className="mt-3 text-fg-muted">
          The waits and limits below are the production defaults. Staging runs shorter and smaller ones.
        </p>
      </>
    ),
  },
  {
    title: 'The clock you are working against',
    icon: ClockIcon,
    body: (
      <>
        <p>Two deadlines decide every referral, and they run in opposite directions:</p>
        <ul className="mt-3 space-y-1.5">
          <Rule>
            <strong>30 days</strong> from joining for the referee to get verified. Miss it and the referral expires
            unpaid — no action needed from you.
          </Rule>
          <Rule>
            <strong>2 days</strong> after the referee is verified before the bot may pay. This is your window, and it is
            the only time the referral is genuinely yours to stop.
          </Rule>
        </ul>
        <p className="mt-3">
          The reward must clear that 2-day wait <em>before</em> the 30-day deadline, so a referee who verifies on day 29
          is already too late. The 30 days are counted to the moment the bot reserves the payout, not to verification.
        </p>
        <p className="mt-3">
          Clearing the wait is not the same as being paid. Both people must still hold their Humanity Court stake, the
          referee must still be verified with no revocation pending, and the referrer must have cap room. A referral
          failing any of these is retried quietly every few hours — while the 30-day clock keeps running. None of it
          shows in the table, so an <Pill tone="info">Active</Pill> row is not evidence that anything is working.
        </p>
        <p className="mt-3 text-fg-muted">
          The referrer watches this as five stages: Started → In Progress → Verified → Reward Pending → Paid.
        </p>
      </>
    ),
  },
  {
    title: 'Review status — your verdict on one referral',
    icon: ListIcon,
    body: (
      <>
        <dl className="space-y-2.5">
          <Row tone="info" label="Active">
            The starting state, and also one you can set by hand — so it does not prove nobody has looked. The 2-day
            wait is the earliest it can pay, not a promise that it will.
          </Row>
          <Row tone="accent" label="Needs review">
            Parked. The bot skips it until you decide. Going over the monthly cap parks referrals here by itself, with
            the reason filled in.
          </Row>
          <Row tone="success" label="Approved">
            An override, not a stronger Active. Approved is paid{' '}
            <strong>past the 30-day expiry and over the monthly cap</strong>, whitelist or no whitelist. Reach for it to
            rescue something legitimate that ran out of time — not to clear a queue.
          </Row>
          <Row tone="danger" label="Rejected">
            Never paid. You can undo it right up until the referral is reserved into a payout.
          </Row>
        </dl>
        <TheyRead>This referral needs admin review before payout.</TheyRead>
        <p className="mt-3">
          Every change needs a <strong>reason</strong>, and it is one field, not a history. The bot overwrites it on any
          referral still Active or Approved, and your next edit replaces what was there. Treat it as the current note,
          not the record.
        </p>
      </>
    ),
    link: { to: '/referrals?reviewStatus=NeedsReview', label: 'Open the review queue' },
  },
  {
    title: 'Flags — your verdict on a person',
    icon: FlagIcon,
    body: (
      <>
        <p>
          A flag applies to a <strong>humanity</strong>, not a row. Flag someone and every referral they appear in stops
          — the ones where they invited, and the one where they joined.
        </p>
        <ul className="mt-3 space-y-1.5">
          <Rule>
            Reach for this when the problem is the person: suspected sybils, farmed accounts, anything you want frozen
            while you dig
          </Rule>
          <Rule>
            It applies from the <strong>next</strong> screening. A batch the bot is already assembling is not re-checked
            for flags, so a payout seconds from going out still goes out. Money already paid stays paid
          </Rule>
          <Rule>
            A flag freezes the payout, <strong>not the 30-day clock</strong>. Investigate for three weeks and the
            referral expires while you work — unflagging will not bring it back, only{' '}
            <Pill tone="success">Approved</Pill> will
          </Rule>
          <Rule>Unflagging needs its own reason, and it overwrites the one that explained the flag</Rule>
        </ul>
        <TheyRead>Referral rewards are paused while this invitee’s profile is flagged.</TheyRead>
        <p className="mt-3 text-fg-muted">
          That is what the <em>referrer</em> reads about someone they invited. A person you flag directly reads
          something stronger on their own profile — that rewards are paused and “will be paid automatically once your
          profile is cleared”, which is not true for anything that expires while you investigate.
        </p>
      </>
    ),
    link: { to: '/flags', label: 'Open flagged humanities' },
  },
  {
    title: 'The monthly cap, and who escapes it',
    icon: StarIcon,
    body: (
      <>
        <p>
          A referrer gets at most <strong>25 payouts per calendar month</strong>, counted in UTC and counted when a
          payout is <em>reserved</em>, not when it confirms. Number 26 is not thrown away — it lands in{' '}
          <Pill tone="accent">Needs review</Pill> for you to judge.
        </p>
        <p className="mt-3">
          <strong>Whitelisting</strong> a humanity lifts the cap for them entirely, and stops it parking their referrals
          in future. It does not reach backwards, though — and neither does setting a parked referral back to{' '}
          <Pill tone="info">Active</Pill>: the cap is still full, so the next run parks it again and overwrites your
          reason. To release one parked referral, use <Pill tone="success">Approved</Pill>. To release a referrer, use
          the whitelist.
        </p>
        <p className="mt-3 text-fg-muted">
          The referrer sees their own count, and a “Cap reached” marker when they hit it.
        </p>
      </>
    ),
    link: { to: '/whitelist', label: 'Open the cap whitelist' },
  },
  {
    title: 'Payout status — where you lose control',
    icon: CoinIcon,
    body: (
      <>
        <dl className="space-y-2.5">
          <Row tone="muted" label="Unassigned">
            Not picked up yet. Everything on the previous screens still works.
          </Row>
          <Row tone="accent" label="Not sent">
            Reserved into a batch and already signed. <strong>The referral is frozen</strong> — status changes are
            refused from here on.
          </Row>
          <Row tone="info" label="Pending">
            Broadcast, waiting on the chain.
          </Row>
          <Row tone="success" label="Confirmed">
            Paid. The PNK is in the referrer’s wallet.
          </Row>
        </dl>
        <p className="mt-3">
          One rule covers all of it: while a payout is still <Pill tone="muted">Unassigned</Pill> you can stop it, and
          after that you cannot. Rejection is refused outright once a payout exists. A flag still registers, but it
          changes nothing about money already in flight — which the referrer is told plainly.
        </p>
        <TheyRead>
          This invitee’s profile has been flagged. The payout already in flight is unaffected; future rewards are
          paused.
        </TheyRead>
      </>
    ),
    link: { to: '/referrals?payout=Unassigned', label: 'Open unassigned referrals' },
  },
];

export const Tutorial = ({ onClose }: { onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  const finish = () => {
    tutorialSeen.set();
    onClose();
  };

  return (
    <Modal title={`How it works · ${index + 1}/${steps.length}`} onClose={finish}>
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-[10px] bg-accent/15 text-accent">
          <step.icon className="size-[18px]" />
        </div>
        <h4 className="text-[15px] font-semibold">{step.title}</h4>
      </div>
      <div className="mt-3 min-h-[17rem] text-sm leading-relaxed text-fg">{step.body}</div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((_, dot) => (
            <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === index ? 'bg-accent' : 'bg-line-strong'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {step.link && (
            <Link
              to={step.link.to}
              onClick={finish}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-accent"
            >
              {step.link.label}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          )}
          {index > 0 && <Button onClick={() => setIndex(index - 1)}>Back</Button>}
          <Button variant="primary" onClick={isLast ? finish : () => setIndex(index + 1)}>
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
