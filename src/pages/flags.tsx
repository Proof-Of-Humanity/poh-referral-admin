import { api } from '../graphql/client';

import { HumanityListPage } from './humanity-list';

export const FlagsPage = () => (
  <HumanityListPage
    title="Flagged humanities"
    subtitle="Flagged humanities are excluded from referral rewards as referee or referrer."
    enableWarning="This pauses referral rewards involving this humanity, as referee or referrer."
    disableWarning="Rewards involving this humanity resume if every other check passes. A referral that expired while flagged stays unpaid unless set to Approved."
    enableEffect="Applies from the next screening on. A batch the bot is already assembling still goes out, and anything already paid stays paid."
    disableEffect="Applies from the next screening on. Referrals that expired while flagged stay dead unless set to Approved."
    enabledStateLabel="Flagged"
    enableActionLabel="Flag humanity"
    disableActionLabel="Unflag humanity"
    enabledTone="danger"
    queryKey="flagged"
    list={(pagination) => api.FlaggedHumanities({ pagination }).then((data) => data.adminPohFlaggedHumanities)}
    setEnabled={({ humanityId, enabled, reason }) => api.SetHumanityFlag({ humanityId, isFlagged: enabled, reason })}
  />
);
