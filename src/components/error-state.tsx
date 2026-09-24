import { ClientError } from 'graphql-request';

import { Callout } from './callout';

export const errorMessage = (error: unknown): string => {
  // Without a GraphQL error to quote, the client's own message is the whole request and response
  // serialised (a gateway's HTML error page included), so only the status is worth showing.
  if (error instanceof ClientError)
    return error.response.errors?.[0]?.message ?? `The request failed (HTTP ${error.response.status})`;
  return error instanceof Error ? error.message : 'Something went wrong';
};

export const ErrorState = ({ error }: { error: unknown }) => <Callout tone="danger">{errorMessage(error)}</Callout>;
