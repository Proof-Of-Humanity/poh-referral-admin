import { ClientError, GraphQLClient } from 'graphql-request';

import { atlasToken, discardAtlasToken } from '../auth/admin-session';
import { env } from '../config/env';

import { getSdk, type SdkFunctionWrapper } from './generated';

export const isRejectedAsUnauthenticated = (error: unknown) =>
  error instanceof ClientError &&
  (error.response.errors ?? []).some((graphqlError) => graphqlError.extensions?.equivalentHTTPStatusCode === 401);

// Read per request rather than captured: the transport outlives any one session.
const withSessionToken: SdkFunctionWrapper = async (request) => {
  const token = atlasToken();
  try {
    return await request(token ? { authorization: `Bearer ${token}` } : {});
  } catch (error) {
    // AtlasProvider offers no way to clear its own state, so a rejected token is dropped from the
    // storage it reads and the app reloaded. The token guard keeps this from looping.
    if (token && isRejectedAsUnauthenticated(error)) {
      discardAtlasToken();
      window.location.reload();
    }
    throw error;
  }
};

const client = new GraphQLClient(env.graphqlUrl);

export const api = getSdk(client, withSessionToken);

/**
 * For documents assembled at runtime, such as one aliased count per referrer on the page. The
 * generated SDK covers everything with a fixed shape; this goes through the same session wrapper.
 */
export const requestDocument = <T>(document: string, variables?: Record<string, unknown>) =>
  withSessionToken((headers) => client.request<T>(document, variables, headers), 'dynamic', 'query', variables);

// Mirrors MAX_REFERRAL_REASON_LENGTH enforced by the API.
export const MAX_REASON_LENGTH = 500;
