import type { ReactNode, SVGProps } from 'react';

/* Stroked 16x16 glyphs on a shared grid, drawn to sit next to 13px text. */
const Glyph = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
    className={props.className ?? 'size-4'}
  >
    {children}
  </svg>
);

export type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = (props: IconProps) => ReactNode;

export const GaugeIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.5 12a5.5 5.5 0 1 1 11 0" />
    <path d="M8 12V9.5" />
    <path d="M10.6 6.6 8.9 8.6" />
    <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </Glyph>
);

export const ReferralIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="4" cy="4.3" r="2" />
    <circle cx="12" cy="11.7" r="2" />
    <path d="M4 6.6v3.2a2 2 0 0 0 2 2h3.6" />
    <path d="M8.3 10.3 10 12l-1.7 1.7" />
  </Glyph>
);

export const FlagIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M3.5 14V2.6" />
    <path d="M3.5 3.2h7.8l-1.7 2.4 1.7 2.4H3.5" />
  </Glyph>
);

export const StarIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m8 2.2 1.83 3.71 4.09.6-2.96 2.88.7 4.08L8 11.55l-3.66 1.92.7-4.08L2.08 6.5l4.09-.59z" />
  </Glyph>
);

export const ListIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M6 4h8M6 8h8M6 12h5" />
    <circle cx="3" cy="4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="3" cy="8" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </Glyph>
);

export const SearchIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3.4 3.4" />
  </Glyph>
);

export const CheckIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m3 8.4 3.2 3.1L13 4.6" />
  </Glyph>
);

export const CheckCircleIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="m5.3 8.2 1.9 1.9 3.6-4" />
  </Glyph>
);

export const XIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Glyph>
);

export const XCircleIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6 6l4 4M10 6l-4 4" />
  </Glyph>
);

export const WarningIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M8 2.6 14.2 13H1.8z" />
    <path d="M8 6.6v3" />
    <circle cx="8" cy="11.1" r="0.75" fill="currentColor" stroke="none" />
  </Glyph>
);

export const InfoIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.4v3.4" />
    <circle cx="8" cy="5.3" r="0.75" fill="currentColor" stroke="none" />
  </Glyph>
);

export const ClockIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.6V8l2.3 1.7" />
  </Glyph>
);

export const CopyIcon = (props: IconProps) => (
  <Glyph {...props}>
    <rect x="5.6" y="5.6" width="8" height="8" rx="2" />
    <path d="M10.4 3.4a2 2 0 0 0-1.8-1.1H4.4a2 2 0 0 0-2 2v4.2c0 .8.4 1.5 1.1 1.8" />
  </Glyph>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M10 3 5 8l5 5" />
  </Glyph>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m6 3 5 5-5 5" />
  </Glyph>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.6 8h10.8" />
    <path d="M9.6 4.2 13.4 8l-3.8 3.8" />
  </Glyph>
);

export const WalletIcon = (props: IconProps) => (
  <Glyph {...props}>
    <rect x="1.8" y="3.6" width="12.4" height="9" rx="2.4" />
    <path d="M1.8 6.6h12.4" />
    <circle cx="11.4" cy="9.8" r="0.85" fill="currentColor" stroke="none" />
  </Glyph>
);

export const KeyIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="5.2" cy="5.2" r="2.7" />
    <path d="m7.2 7.2 6 6" />
    <path d="m10.6 10.6 1.5-1.5" />
  </Glyph>
);

export const ShieldIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M8 1.8 13 3.6v4.1c0 3-2 5.2-5 6.5-3-1.3-5-3.5-5-6.5V3.6z" />
    <path d="m5.9 7.9 1.5 1.5 3-3.2" />
  </Glyph>
);

export const BoltIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M9 1.6 3.8 8.9h3.5l-.7 5.5 5.4-7.4H8.4z" />
  </Glyph>
);

export const CoinIcon = (props: IconProps) => (
  <Glyph {...props}>
    <ellipse cx="8" cy="4.4" rx="5.4" ry="2.4" />
    <path d="M2.6 4.4v3.3c0 1.3 2.4 2.4 5.4 2.4s5.4-1.1 5.4-2.4V4.4" />
    <path d="M2.6 7.7v3.3c0 1.3 2.4 2.4 5.4 2.4s5.4-1.1 5.4-2.4V7.7" />
  </Glyph>
);

export const BookIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.4 3.2c1.9-.7 3.8-.7 5.6.4v9.2c-1.8-1.1-3.7-1.1-5.6-.4z" />
    <path d="M13.6 3.2c-1.9-.7-3.8-.7-5.6.4v9.2c1.8-1.1 3.7-1.1 5.6-.4z" />
  </Glyph>
);

export const SignOutIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M6.2 2.6H4a1.6 1.6 0 0 0-1.6 1.6v7.6A1.6 1.6 0 0 0 4 13.4h2.2" />
    <path d="M9.6 4.8 12.8 8l-3.2 3.2" />
    <path d="M12.8 8H6" />
  </Glyph>
);

export const PlusIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M8 3.4v9.2M3.4 8h9.2" />
  </Glyph>
);

export const TrayIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.2 9.4h3l.9 1.8h3.8l.9-1.8h3" />
    <path d="M4 3.2h8l1.8 6.2v2.2a1.4 1.4 0 0 1-1.4 1.4H3.6a1.4 1.4 0 0 1-1.4-1.4V9.4z" />
  </Glyph>
);

export const FilterIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.6 4.4h10.8M4.6 8h6.8M6.4 11.6h3.2" />
  </Glyph>
);

export const LinkIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M6.7 9.3a2.6 2.6 0 0 0 3.9.3l1.8-1.8a2.6 2.6 0 0 0-3.7-3.7l-1 1" />
    <path d="M9.3 6.7a2.6 2.6 0 0 0-3.9-.3L3.6 8.2a2.6 2.6 0 0 0 3.7 3.7l1-1" />
  </Glyph>
);

export const LockIcon = (props: IconProps) => (
  <Glyph {...props}>
    <rect x="3.4" y="7" width="9.2" height="6.4" rx="1.8" />
    <path d="M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7" />
  </Glyph>
);

export const PersonIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="8" cy="5.4" r="2.6" />
    <path d="M3 13.4a5 5 0 0 1 10 0" />
  </Glyph>
);
