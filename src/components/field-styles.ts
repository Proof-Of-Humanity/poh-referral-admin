// A field carrying a filter value is tinted, so a panel of controls shows which ones are set. The
// border stays free for focus and for a value that can never be valid, which is outlined in red.
export const fieldBase =
  'rounded-[10px] border border-transparent bg-fill text-fg transition-colors placeholder:text-fg-faint focus:border-info/70 focus:outline-none disabled:opacity-45 data-[active=true]:bg-info/12 aria-[invalid=true]:border-danger/70';
export const fieldSize = 'w-full px-3 py-2 text-[13px]';
export const fieldClass = `${fieldBase} ${fieldSize}`;
