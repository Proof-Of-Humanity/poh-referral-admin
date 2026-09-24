import { useState } from 'react';
import { Link } from 'react-router-dom';

import { shortAddress } from '../lib/format';

import { CheckIcon, CopyIcon } from './icons';
import { useToast } from './toast';

const chipClass =
  'group -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[12.5px] whitespace-nowrap text-fg transition-colors hover:bg-fill focus-visible:bg-fill';

/** Click copies the address. With `to`, the address opens that page and only the icon copies. */
export const AddressChip = ({ address, to }: { address: string; to?: string }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // A refused clipboard is indistinguishable from a dead button unless it says so.
      toast('Could not copy — the full address is in the tooltip', 'danger');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const copyIcon = copied ? (
    <CheckIcon className="size-3 shrink-0 text-success" />
  ) : (
    // Hover or focus reveals it; a touch screen has neither, so there it stays faintly visible.
    <CopyIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60 [@media(hover:none)]:opacity-60" />
  );

  if (to) {
    return (
      <span className={chipClass}>
        <Link
          to={to}
          title={address}
          className="underline decoration-fg-faint decoration-dotted underline-offset-2 hover:text-accent hover:decoration-solid focus-visible:text-accent"
        >
          {shortAddress(address)}
        </Link>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy address"
          className="hover:text-accent focus-visible:text-accent focus-visible:[&>svg]:opacity-60"
        >
          {copyIcon}
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={address}
      className={`${chipClass} hover:text-accent focus-visible:text-accent`}
    >
      {shortAddress(address)}
      {copyIcon}
    </button>
  );
};
