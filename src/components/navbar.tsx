import { NavLink } from 'react-router-dom';

import {
  BookIcon,
  FlagIcon,
  GaugeIcon,
  ReferralIcon,
  StarIcon,
  type IconComponent,
} from './icons';

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

export const Navbar = ({ onOpenTutorial }: { onOpenTutorial: () => void }) => (
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
      onClick={onOpenTutorial}
      className="mt-auto flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
    >
      <BookIcon className="size-4 shrink-0 opacity-85" />
      How it works
    </button>
  </aside>
);
