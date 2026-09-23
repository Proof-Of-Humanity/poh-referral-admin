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
    <div className="grid h-screen grid-cols-[232px_minmax(0,1fr)] grid-rows-[52px_minmax(0,1fr)]">
      <header className="col-span-2 flex items-center gap-3 border-b border-line bg-material pr-7 pl-5">
        <div className="flex items-center gap-2">
          <div className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-accent text-black/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <ShieldIcon className="size-3.5" />
          </div>
          <span className="font-display text-[13px] font-semibold">Referral Admin</span>
        </div>
        <ApiEnvironmentSelect className="ml-auto" compact />
        <span className="font-mono text-[12px] text-fg-muted">{signedInAs ? shortAddress(signedInAs) : '—'}</span>
        <Button onClick={logout}>
          <SignOutIcon className="size-3.5" />
          Sign out
        </Button>
      </header>

      <Navbar onOpenTutorial={() => setTutorialOpen(true)} />

      <main className="overflow-y-auto px-7 py-6">
        <Outlet />
      </main>
      {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </div>
  );
};
