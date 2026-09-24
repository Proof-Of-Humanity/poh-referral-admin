import type { Tone } from './tone';

const barColors: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-fg-faint',
};

export type BreakdownRow = [label: string, value: number, tone: Tone];

/** Labelled counts with a bar each, sized against `total` so the rows read as shares of one whole. */
export const Breakdown = ({ rows, total }: { rows: BreakdownRow[]; total: number }) => (
  <ul className="space-y-3">
    {rows.map(([label, value, tone]) => (
      <li key={label}>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-fg-muted">{label}</span>
          <span className="text-fg">{value}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full ${barColors[tone]}`}
            style={{ width: total ? `max(2px, ${(value / total) * 100}%)` : 0 }}
          />
        </div>
      </li>
    ))}
  </ul>
);
