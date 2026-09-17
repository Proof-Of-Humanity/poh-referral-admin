import type { Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { createSiweMessage } from 'viem/siwe';

import { env } from '../config/env';
import { api } from '../graphql/client';

import { session } from './session';

const SESSION_TTL_MS = 60 * 60 * 1000;

type Signer = {
  address: Address;
  chainId: number;
  signMessage: (message: string) => Promise<`0x${string}`>;
};

// Parsed lazily so a malformed dev key only breaks the login page, not app boot.
export const devBurnerSigner = (): Signer | null => {
  if (!env.devBurnerPrivateKey) return null;
  const account = privateKeyToAccount(env.devBurnerPrivateKey as `0x${string}`);
  return { address: account.address, chainId: sepolia.id, signMessage: (message) => account.signMessage({ message }) };
};

// The login mutation returns an untyped JSON scalar carrying the issued JWT.
type LoginResult = { accessToken: string };

export const signInWithEthereum = async ({ address, chainId, signMessage }: Signer): Promise<void> => {
  const { nonce } = await api.Nonce({ address });
  const message = createSiweMessage({
    address,
    chainId,
    domain: window.location.host,
    uri: window.location.origin,
    nonce,
    version: '1',
    statement: 'Sign in to the Proof of Humanity referral admin dashboard.',
    expirationTime: new Date(Date.now() + SESSION_TTL_MS),
  });
  const signature = await signMessage(message);
  const { login } = await api.Login({ message, signature });
  session.store((login as LoginResult).accessToken);
};
