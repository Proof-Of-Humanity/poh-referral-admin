import { formatUnits } from 'viem';

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export const formatPnk = (wei: string | bigint) => {
  const value = Number(formatUnits(BigInt(wei), 18));
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} PNK`;
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const formatRelative = (iso: string) => {
  const diffMs = new Date(iso).getTime() - Date.now();
  for (const [unit, ms] of relativeUnits) {
    if (Math.abs(diffMs) >= ms) return relativeFormatter.format(Math.round(diffMs / ms), unit);
  }
  return 'just now';
};

// viem checks the checksum of a mixed-case address, so a mistyped one is refused even at full length.
// Lowercasing it is the fix a reader can act on.
export const INVALID_ADDRESS_HINT = 'Not a valid address. Check for a typo, or paste it in lowercase.';
