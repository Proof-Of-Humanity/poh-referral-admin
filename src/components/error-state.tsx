import { ClientError } from 'graphql-request';

import { WarningIcon } from './icons';

const errorMessage = (error: unknown): string => {
  if (error instanceof ClientError) return error.response.errors?.[0]?.message ?? error.message;
  return error instanceof Error ? error.message : 'Something went wrong';
};

export const ErrorState = ({ error }: { error: unknown }) => (
  <div className="flex items-start gap-2 rounded-[10px] border border-danger/35 bg-danger/10 px-4 py-3 text-[13px] text-danger">
    <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
    {errorMessage(error)}
  </div>
);
