// The time filter follows the payout bot, which works in UTC. Everything here takes and returns
// epoch milliseconds so callers can key queries on plain numbers.

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

/** Whole-day bounds for a `YYYY-MM-DD` input value, or null when it is not a date. */
export const utcDayBounds = (day: string): { from: number; to: number } | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const from = Date.parse(`${day}T00:00:00.000Z`);
  // Date.parse rolls an impossible day such as 02-31 into the next month; the round trip catches it.
  if (Number.isNaN(from) || new Date(from).toISOString().slice(0, 10) !== day) return null;
  return { from, to: from + DAY_MS - 1 };
};
