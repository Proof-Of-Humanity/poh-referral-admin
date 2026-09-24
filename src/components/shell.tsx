import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { atlasClaims, discardAtlasToken } from '../auth/admin-session';
import { shortAddress } from '../lib/format';

import { ShieldIcon, SignOutIcon } from './icons';
import { ApiEnvironmentSelect } from './api-environment';
import { Navbar } from './navbar';
import { Tutorial, tutorialSeen } from './tutorial';
import { Button } from './button';

export const Shell = () => {
  const queryClient = useQueryClient();
  const signedInAs = atlasClaims()?.sub;
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen.get());

  // A reload is the only way to reset AtlasProvider: it keeps the token in its own state and
  // exposes no sign-out.
  const logout = () => {
    discardAtlasToken();
    queryClient.clear();
    window.location.reload();
  };

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)] grid-rows-[52px_auto_minmax(0,1fr)] md:grid-cols-[232px_minmax(0,1fr)] md:grid-rows-[52px_minmax(0,1fr)]">
      {/* A phone fits the environment picker and its Live data warning, or the wordmark and a labelled button, not both. */}
      <header className="col-span-full flex items-center gap-3 border-b border-line bg-material px-4 backdrop-blur-2xl md:pr-7 md:pl-5">
        <div className="flex items-center gap-2">
          <div className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-accent text-black/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <ShieldIcon className="size-3.5" />
          </div>
          <span className="hidden font-display text-[13px] font-semibold whitespace-nowrap sm:inline">Referral Admin</span>
        </div>
        <ApiEnvironmentSelect className="ml-auto" compact />
        <span className="hidden font-mono text-[12px] text-fg-muted sm:inline">
          {signedInAs ? shortAddress(signedInAs) : '—'}
        </span>
        <Button onClick={logout} aria-label="Sign out" title="Sign out">
          <SignOutIcon className="size-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </header>

      <Navbar onOpenTutorial={() => setTutorialOpen(true)} />

      <main className="min-w-0 overflow-y-auto px-4 py-5 md:px-7 md:py-6">
        <Outlet />
      </main>
      {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </div>
  );
};
