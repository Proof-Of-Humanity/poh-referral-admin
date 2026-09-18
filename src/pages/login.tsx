import { useAtlasProvider } from '@kleros/kleros-app';
import { useAppKit } from '@reown/appkit/react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';

import { atlasClaims, isPohAdmin, rememberTokenStage } from '../auth/admin-session';
import { ApiEnvironmentSelect } from '../components/api-environment';
import { KeyIcon, ShieldIcon, WalletIcon, WarningIcon, XIcon } from '../components/icons';
import { Button } from '../components/button';
import { ErrorState } from '../components/error-state';
import { Field } from '../components/field';
import { shortAddress } from '../lib/format';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const routedFrom = location.state as { from?: string } | null;
  const destination = routedFrom?.from ?? '/';
  const { authoriseUser, isSigningIn } = useAtlasProvider();
  const [error, setError] = useState<unknown>(null);
  const signedIn = atlasClaims() !== null;
  if (isPohAdmin()) return <Navigate to={destination} replace />;

  const signIn = async () => {
    setError(null);
    try {
      await authoriseUser();
      rememberTokenStage();
      navigate(destination, { replace: true });
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[20px] border border-line bg-surface/80 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="grid size-11 place-items-center rounded-[13px] bg-accent text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <ShieldIcon className="size-6" />
        </div>
        <div className="mt-5 text-[12px] font-medium text-fg-muted">Proof of Humanity</div>
        <h1 className="mt-1 text-[26px] font-bold">Referral Admin</h1>
        <p className="mt-2 text-[13px] text-fg-muted">
          Sign in with an admin wallet to review referrals, flags and payout caps.
        </p>

        <div className="mt-6">
          <Field label="Environment">
            <ApiEnvironmentSelect />
          </Field>
        </div>

        <div className="mt-6 space-y-3">
          {isConnected && address ? (
            <>
              <div className="flex items-center justify-between rounded-[10px] bg-fill px-3 py-2 font-mono text-[13px]">
                <span className="flex items-center gap-2">
                  <WalletIcon className="size-3.5 shrink-0 text-fg-muted" />
                  {shortAddress(address)}
                </span>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  disabled={isSigningIn}
                  className="flex items-center gap-1.5 font-sans text-[13px] text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
                >
                  <XIcon className="size-3.5 shrink-0" />
                  Disconnect
                </button>
              </div>
              <Button variant="primary" className="w-full" onClick={signIn} disabled={isSigningIn}>
                <KeyIcon className="size-3.5" />
                {isSigningIn ? 'Awaiting signature…' : 'Sign in with Ethereum'}
              </Button>
            </>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => open()}>
              <WalletIcon className="size-3.5" />
              Connect wallet
            </Button>
          )}
        </div>

        {error !== null && (
          <div className="mt-4">
            <ErrorState error={error} />
          </div>
        )}
        {error === null && signedIn && (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-accent/35 bg-accent/10 px-4 py-3 text-[13px] text-accent">
            <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
            Signed in, but this wallet has no admin role.
          </div>
        )}
      </div>
    </div>
  );
};
