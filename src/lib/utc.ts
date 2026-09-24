// The cap, the activity counts and the time filter all follow the payout bot, which works in UTC.
// Everything here takes and returns epoch milliseconds so callers can key queries on plain numbers.

export const utcMonthStart = (now: number) => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

export const utcDayStart = (now: number) => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Rounded down to the hour, so a query keyed on it refetches hourly instead of on every render. */
export const hourFloor = (now: number) => Math.floor(now / HOUR_MS) * HOUR_MS;

export const isInUtcMonth = (iso: string, now: number) => new Date(iso).getTime() >= utcMonthStart(now);

/** Whole-day bounds for a `YYYY-MM-DD` input value, or null when it is not a date. */
export const utcDayBounds = (day: string): { from: number; to: number } | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const from = Date.parse(`${day}T00:00:00.000Z`);
  // Date.parse rolls an impossible day such as 02-31 into the next month; the round trip catches it.
  if (Number.isNaN(from) || new Date(from).toISOString().slice(0, 10) !== day) return null;
  return { from, to: from + DAY_MS - 1 };
};

const remainingUnits: [label: string, ms: number][] = [
  ['d', DAY_MS],
  ['h', HOUR_MS],
  ['m', 60_000],
];

/** "1d 3h", "17h 42m", "9m": the two largest non-zero units, which is all a countdown needs. */
export const formatRemaining = (ms: number) => {
  let rest = Math.max(0, ms);
  const parts: string[] = [];
  for (const [label, unit] of remainingUnits) {
    const value = Math.floor(rest / unit);
    if (value > 0 || (parts.length > 0 && label === 'm')) parts.push(`${value}${label}`);
    rest -= value * unit;
    if (parts.length === 2) break;
  }
  return parts.length ? parts.join(' ') : 'under 1m';
};
