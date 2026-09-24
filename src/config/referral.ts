// These mirror the Atlas env defaults (POH_REFERRAL_SAFETY_WINDOW_IN_SECONDS,
// POH_REFERRAL_MONTHLY_PAYOUT_CAP, POH_REFERRAL_EXPIRY_WINDOW_IN_SECONDS). A deployment may
// override any of them, so everything derived here is a signal to read against the bot's own
// decisions, not a re-implementation of them.
export const PAYOUT_SAFETY_WINDOW_MS = 48 * 60 * 60 * 1000;
export const MONTHLY_PAYOUT_CAP = 25;
export const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Volume thresholds this dashboard flags on its own; the bot has no such rule.
export const HIGH_VOLUME_MONTH = 20;
export const HIGH_VELOCITY_DAY = 5;

export const SUBGRAPH_DOWN_HINT = 'PoH status unavailable: the subgraph did not answer.';

export const externalTools: { label: string; href: string; description: string }[] = [
  {
    label: 'PoH Duplicate Finder',
    href: 'https://poh-duplicate-finder.netlify.app',
    description: 'Compare a profile against existing registrations.',
  },
  {
    label: 'PoH Dashboard',
    href: 'https://poh-dashboard.netlify.app',
    description: 'Registry activity and request history.',
  },
  {
    label: 'Social Graph',
    href: 'https://boisterous-arithmetic-6b1a62.netlify.app/?hops=3',
    description: 'Vouch and referral connections between humanities.',
  },
];
