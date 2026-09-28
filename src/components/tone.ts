export type Tone = 'accent' | 'success' | 'danger' | 'info' | 'muted';

export const toneFill: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-fg-faint',
};

export const toneText: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  muted: 'text-fg',
};
