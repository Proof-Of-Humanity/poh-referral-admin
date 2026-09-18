import { api } from '../graphql/client';

import { HumanityListPage } from './humanity-list';

export const FlagsPage = () => (
  <HumanityListPage
    title="Flagged humanities"
    subtitle="Flagged humanities are excluded from referral rewards as referee or referrer."
    enableEffect="Stops every referral this humanity appears in, as referee or referrer, from the next screening on. A batch the bot is already assembling still goes out, and anything already paid stays paid."
    disableEffect="Restores eligibility from the next screening. Referrals that passed their 30-day expiry while flagged stay dead — only Approved revives those."
    enabledStateLabel="Flagged"
    enableActionLabel="Flag humanity"
    disableActionLabel="Unflag humanity"
    enabledTone="danger"
    queryKey="flagged"
    list={(pagination) => api.FlaggedHumanities({ pagination }).then((data) => data.adminPohFlaggedHumanities)}
    setEnabled={({ humanityId, enabled, reason }) => api.SetHumanityFlag({ humanityId, isFlagged: enabled, reason })}
  />
);
