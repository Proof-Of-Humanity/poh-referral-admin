import { AtlasProvider, SignupProduct } from '@kleros/kleros-app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';

import { App } from './app';
import { discardTokenFromAnotherStage } from './auth/admin-session';
import { ToastProvider } from './components/toast';
import { env } from './config/env';
import { wagmiConfig } from './config/wagmi';
import './styles.css';

// Nothing here changes faster than the hourly payout bot, so re-reading it on every navigation buys
// nothing. Mutations invalidate explicitly, so an admin's own edits still show up at once.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

discardTokenFromAnotherStage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Sign-in, the JWT and its expiry are all handled by the shared Kleros provider. */}
        <AtlasProvider config={{ uri: env.atlasUri, signupProduct: SignupProduct.PohV2, wagmiConfig }}>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </AtlasProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
