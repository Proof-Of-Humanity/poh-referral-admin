import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { BookIcon, ClockIcon, FlagIcon, GaugeIcon, ReferralIcon, StarIcon, type IconComponent } from './icons';

type NavItem = { to: string; label: string; icon: IconComponent; end?: boolean };

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Decide',
    items: [
      { to: '/queue', label: 'Review queue', icon: ClockIcon },
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

export const Navbar = ({ onOpenTutorial }: { onOpenTutorial: () => void }) => {
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  // The phone layout scrolls the row, so the current page is brought into view rather than left off the edge.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    // Below md the sections sit in one scrolling row, so the page never grows wider than the phone.
    <aside
      ref={nav}
      className="flex gap-1 overflow-x-auto border-b border-line bg-surface/45 p-2 [mask-image:linear-gradient(to_right,black_88%,transparent)] md:flex-col md:gap-0 md:overflow-y-auto md:border-r md:border-b-0 md:p-2.5 md:[mask-image:none]"
    >
      {navSections.map((section) => (
        <div key={section.title} className="flex shrink-0 gap-1 md:mb-4 md:block">
          <div className="hidden px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.05em] text-fg-faint uppercase md:block">
            {section.title}
          </div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
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
        onClick={onOpenTutorial}
        className="flex shrink-0 items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] font-medium whitespace-nowrap text-fg-muted transition-colors hover:bg-white/5 hover:text-fg md:mt-auto"
      >
        <BookIcon className="size-4 shrink-0 opacity-85" />
        How it works
      </button>
    </aside>
  );
};
