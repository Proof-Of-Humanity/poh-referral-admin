export type Tone = 'accent' | 'success' | 'danger' | 'info' | 'muted';

export const toneText: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  muted: 'text-fg',
};
