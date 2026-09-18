import { isAddress } from 'viem';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AddressChip } from '../components/address';
import { useToast } from '../components/toast';
import { CheckIcon, PersonIcon, PlusIcon, XIcon } from '../components/icons';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { ErrorState } from '../components/error-state';
import { Field } from '../components/field';
import { Input } from '../components/input';
import { Modal } from '../components/modal';
import { PageHeader } from '../components/page-header';
import { PagedTablePanel } from '../components/paged-table-panel';
import { Textarea } from '../components/textarea';
import { MAX_REASON_LENGTH } from '../graphql/client';
import { AdminHumanitySortField, SortDirection, type AdminHumanityPaginationInput } from '../graphql/generated';
import { INVALID_ADDRESS_HINT, shortAddress } from '../lib/format';

const PAGE_SIZE = 20;

type HumanityRow = { humanityId: string; reason: string };
type HumanityStateChange = { humanityId: string; targetEnabled: boolean };
type HumanityPage = { count: number; hasNextPage: boolean; items: { item: HumanityRow }[] };

type HumanityListConfig = {
  title: string;
  subtitle: string;
  /** What the change actually does, shown in the modal before it is made. */
  enableEffect: string;
  disableEffect: string;
  enabledStateLabel: string;
  enableActionLabel: string;
  disableActionLabel: string;
  enabledTone: 'danger' | 'info';
  queryKey: string;
  list: (pagination: AdminHumanityPaginationInput) => Promise<HumanityPage>;
  setEnabled: (input: { humanityId: string; enabled: boolean; reason: string }) => Promise<unknown>;
};

export const HumanityListPage = (config: HumanityListConfig) => {
  const [page, setPage] = useState(0);
  const [stateChange, setStateChange] = useState<HumanityStateChange | null>(null);

  const list = useQuery({
    queryKey: [config.queryKey, page],
    // Paging keeps the rows already on screen rather than emptying the table into placeholders.
    placeholderData: keepPreviousData,
    queryFn: () =>
      config.list({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: AdminHumanitySortField.UpdatedAt,
        orderDirection: SortDirection.Desc,
      }),
  });
  // Deleting the last row of a page leaves it empty; step back during render rather than in an Effect.
  if (page > 0 && list.data?.items.length === 0) setPage(page - 1);

  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Button variant="primary" onClick={() => setStateChange({ humanityId: '', targetEnabled: true })}>
            <PlusIcon className="size-3.5" />
            {config.enableActionLabel}
          </Button>
        }
      />
      <PagedTablePanel
        pageQuery={list}
        pageIndex={page}
        rowsPerPage={PAGE_SIZE}
        onPageChange={setPage}
        columnHeadings={['Humanity', 'State', 'Reason', '']}
        noRowsMessage="Nothing here yet"
      >
        {list.data?.items.map(({ item }) => (
          <tr key={item.humanityId} className="border-b border-line/60 align-top hover:bg-accent/5">
            <td className="py-3 pr-3">
              <span className="flex items-center gap-1.5">
                <PersonIcon className="size-3.5 shrink-0 text-fg-faint" />
                <AddressChip address={item.humanityId} />
              </span>
            </td>
            <td className="py-3 pr-3">
              <Badge tone={config.enabledTone}>{config.enabledStateLabel}</Badge>
            </td>
            <td className="py-3 pr-3 text-fg-muted">
              <div className="max-w-md truncate" title={item.reason}>
                {item.reason}
              </div>
            </td>
            <td className="py-3 text-right">
              <Button
                variant="danger"
                onClick={() => setStateChange({ humanityId: item.humanityId, targetEnabled: false })}
              >
                <XIcon className="size-3.5" />
                {config.disableActionLabel}
              </Button>
            </td>
          </tr>
        ))}
      </PagedTablePanel>
      {stateChange && <HumanityStateModal config={config} change={stateChange} onClose={() => setStateChange(null)} />}
    </>
  );
};

const HumanityStateModal = ({
  config,
  change,
  onClose,
}: {
  config: HumanityListConfig;
  change: HumanityStateChange;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [humanityId, setHumanityId] = useState(change.humanityId);
  const [reason, setReason] = useState('');
  const actionLabel = change.targetEnabled ? config.enableActionLabel : config.disableActionLabel;
  const effect = change.targetEnabled ? config.enableEffect : config.disableEffect;
  const addressInvalid = humanityId !== '' && !isAddress(humanityId);

  const save = useMutation({
    mutationFn: () => config.setEnabled({ humanityId, enabled: change.targetEnabled, reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [config.queryKey] }),
        queryClient.invalidateQueries({ queryKey: ['referrals'] }),
      ]);
      toast(`${actionLabel}: ${shortAddress(humanityId)}`);
      onClose();
    },
  });
  return (
    // Locked once something is typed, so a stray click on the backdrop cannot bin the reason.
    <Modal title={actionLabel} onClose={onClose} locked={save.isPending || reason.trim() !== ''}>
      <p className="mb-4 text-[13px] text-fg-muted">{effect}</p>
      <div className="space-y-4">
        <Field label="Humanity address" hint={addressInvalid ? INVALID_ADDRESS_HINT : undefined}>
          <Input
            value={humanityId}
            onChange={(event) => setHumanityId(event.target.value.trim())}
            placeholder="0x…"
            disabled={Boolean(change.humanityId)}
          />
        </Field>
        <Field label="Reason" hint="Required. Replaces the current note — there is no history.">
          <Textarea maxLength={MAX_REASON_LENGTH} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {save.error && <ErrorState error={save.error} />}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={save.isPending}>
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            className="min-w-44"
            variant={change.targetEnabled ? 'primary' : 'danger'}
            disabled={!isAddress(humanityId) || !reason.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            <CheckIcon className="size-3.5" />
            {save.isPending ? 'Saving…' : actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
