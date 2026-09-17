import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { gnosis, gnosisChiado, mainnet, sepolia, type AppKitNetwork } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';

import { env } from './env';

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, gnosisChiado, gnosis, mainnet];

const wagmiAdapter = new WagmiAdapter({ projectId: env.walletConnectProjectId, networks });

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: env.walletConnectProjectId,
  metadata: {
    name: 'PoH Referral Admin',
    description: 'Proof of Humanity referral program administration',
    url: window.location.origin,
    icons: [],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#ff9900',
    '--w3m-color-mix': '#08090c',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '1px',
    '--w3m-font-family': 'Inter, sans-serif',
  },
  features: { analytics: false, email: false, socials: false },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
