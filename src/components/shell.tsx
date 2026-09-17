import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { atlasClaims, discardAtlasToken } from '../auth/admin-session';
import { shortAddress } from '../lib/format';

import {
  BookIcon,
  FlagIcon,
  GaugeIcon,
  ReferralIcon,
  ShieldIcon,
  SignOutIcon,
  StarIcon,
  type IconComponent,
} from './icons';
import { ApiEnvironmentSelect } from './api-environment';
import { Tutorial, tutorialSeen } from './tutorial';
import { Button } from './button';

type NavItem = { to: string; label: string; icon: IconComponent; end?: boolean };

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Decide',
    items: [
      { to: '/referrals', label: 'Referrals', icon: ReferralIcon },
      { to: '/flags', label: 'Flagged humanities', icon: FlagIcon },
      { to: '/whitelist', label: 'Cap whitelist', icon: StarIcon },
    ],
  },
  {
    title: 'Monitor',
    items: [{ to: '/', label: 'Overview', end: true, icon: GaugeIcon }],
  },
];

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
      <header className="col-span-2 flex items-center gap-3 border-b border-line bg-material pr-7 pl-5 backdrop-blur-2xl">
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

      <aside className="flex flex-col overflow-y-auto border-r border-line bg-surface/45 p-2.5">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase">
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-white/10 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
                  }`
                }
              >
                <item.icon className="size-4 shrink-0 opacity-85" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          className="mt-auto flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <BookIcon className="size-4 shrink-0 opacity-85" />
          How it works
        </button>
      </aside>

      <main className="overflow-y-auto px-7 py-6">
        <Outlet />
      </main>
      {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </div>
  );
};
