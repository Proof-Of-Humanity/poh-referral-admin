import { useState } from 'react';

import { shortAddress } from '../lib/format';

import { CheckIcon, CopyIcon } from './icons';
import { useToast } from './toast';

export const AddressChip = ({ address }: { address: string }) => {
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
  return (
    <button
      type="button"
      onClick={copy}
      title={address}
      className="group -mx-1.5 inline-flex whitespace-nowrap items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[12.5px] text-fg transition-colors hover:bg-fill hover:text-accent focus-visible:bg-fill focus-visible:text-accent"
    >
      {shortAddress(address)}
      {copied ? (
        <CheckIcon className="size-3 shrink-0 text-success" />
      ) : (
        <CopyIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" />
      )}
    </button>
  );
};
