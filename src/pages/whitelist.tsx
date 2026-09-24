import { api } from '../graphql/client';

import { HumanityListPage } from './humanity-list';

export const WhitelistPage = () => (
  <HumanityListPage
    title="Cap whitelist"
    subtitle="Whitelisted humanities are exempt from the monthly referral reward cap."
    enableWarning="This humanity will no longer be subject to the standard monthly referral cap."
    disableWarning="The monthly cap applies to this humanity again from the next payout run."
    enableEffect="Referrals already parked in Needs review stay parked — set those to Approved to release them."
    disableEffect="Referrals already paid or reserved are unaffected."
    enabledStateLabel="Whitelisted"
    enableActionLabel="Whitelist humanity"
    disableActionLabel="Remove from whitelist"
    enabledTone="info"
    queryKey="whitelisted"
    list={(pagination) => api.WhitelistedHumanities({ pagination }).then((data) => data.adminPohWhitelistedHumanities)}
    setEnabled={({ humanityId, enabled, reason }) =>
      api.SetMonthlyCapWhitelist({ humanityId, isWhitelisted: enabled, reason })
    }
  />
);
