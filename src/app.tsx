import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAdmin } from './auth/require-admin';
import { Shell } from './components/shell';
import { FlagsPage } from './pages/flags';
import { LoginPage } from './pages/login';
import { OverviewPage } from './pages/overview';
import { ReferralsPage } from './pages/referrals';
import { ReferrerPage } from './pages/referrer';
import { WhitelistPage } from './pages/whitelist';

export const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAdmin />}>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="referrers/:humanityId" element={<ReferrerPage />} />
        <Route path="flags" element={<FlagsPage />} />
        <Route path="whitelist" element={<WhitelistPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
