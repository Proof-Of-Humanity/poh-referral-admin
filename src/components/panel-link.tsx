import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The pill in a panel header that opens the full list behind the panel's summary. */
export const PanelLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="rounded-full bg-fill px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg"
  >
    {children}
  </Link>
);
