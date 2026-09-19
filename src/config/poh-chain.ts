import { parseUnits } from 'viem';
import { gnosis, gnosisChiado } from 'viem/chains';

import { apiEnvironment, type ApiEnvironmentName } from './env';

type PohChain = { label: string; subgraphUrl: string };

// The gateway keys are billable but already public — poh-web inlines these same URLs into its
// client bundle — so they are literals rather than another VITE var nobody would set.
const mainnets: PohChain[] = [
  {
    label: 'Gnosis',
    subgraphUrl:
      'https://gateway.thegraph.com/api/f3adab161404f3371d02cb79104fe7d4/subgraphs/id/FFx16fGNSpdq2TpQer3KqpadP8UaLELS4Jocd1LtwAmG',
  },
  {
    label: 'Ethereum',
    subgraphUrl:
      'https://gateway.thegraph.com/api/d5c7982a40f63da9504805d11919004d/subgraphs/id/8oHw9qNXdeCT2Dt4QPZK9qHZNAhPWNVrCKnFDarYEJF5',
  },
];

const testnets: PohChain[] = [
  {
    label: 'Chiado',
    subgraphUrl:
      'https://gateway.thegraph.com/api/e02864a4fcc7e5296dcd394b0b4e0d20/subgraphs/id/4nMw7ov96udrnCMC3LrHPZusLzN6R8ZP23vGBsxnxmcZ',
  },
  {
    label: 'Sepolia',
    subgraphUrl:
      'https://gateway.thegraph.com/api/e02864a4fcc7e5296dcd394b0b4e0d20/subgraphs/id/8SN9yzjc3FZdc7WNHTcWJod9KhWyoQJ4MwEpMWRVHX1N',
  },
];

const chainSets: Record<ApiEnvironmentName, PohChain[]> = { local: testnets, staging: testnets, production: mainnets };

// Which set Atlas is pointed at comes from its POHV2_CHAINSET (SSM /atlas/pohv2/Chainset); these
// mirror it, and a wrong guess shows up as "No record on …" on every row rather than as a
// plausible status.
export const pohChains = chainSets[apiEnvironment];

/**
 * Stake always lives on the Humanity Court chain, never the chain the humanity is registered on, so
 * keeping the chain, contract, court and threshold in one record makes the wrong pairing
 * unrepresentable. The threshold mirrors the API's POH_REFERRAL_MIN_REFERRER_STAKE_WEI and is
 * display-only — the Payout column is the authority.
 */
export const humanityCourt: {
  chainId: typeof gnosis.id | typeof gnosisChiado.id;
  klerosLiquid: `0x${string}`;
  subcourtId: bigint;
  minStakeWei: bigint;
} =
  apiEnvironment === 'production'
    ? {
        chainId: gnosis.id,
        klerosLiquid: '0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002',
        subcourtId: 18n,
        minStakeWei: parseUnits('1200', 18),
      }
    : {
        chainId: gnosisChiado.id,
        klerosLiquid: '0xD8798DfaE8194D6B4CD6e2Da6187ae4209d06f27',
        subcourtId: 0n,
        minStakeWei: parseUnits('1000', 18),
      };

// uint96 needs a bigint, not a number
export const stakeOfAbi = [
  {
    type: 'function',
    name: 'stakeOf',
    stateMutability: 'view',
    inputs: [
      { name: '_account', type: 'address' },
      { name: '_subcourtID', type: 'uint96' },
    ],
    outputs: [{ name: 'stake', type: 'uint256' }],
  },
] as const;
