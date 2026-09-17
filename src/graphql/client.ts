import { ClientError, GraphQLClient } from 'graphql-request';

import { session } from '../auth/session';
import { env } from '../config/env';

import { getSdk, type SdkFunctionWrapper } from './generated';

const isRejectedAsUnauthenticated = (error: unknown) =>
  error instanceof ClientError &&
  (error.response.errors ?? []).some((graphqlError) => graphqlError.extensions?.equivalentHTTPStatusCode === 401);

const withSessionToken: SdkFunctionWrapper = async (request) => {
  const token = session.token();
  try {
    return await request(token ? { authorization: `Bearer ${token}` } : {});
  } catch (error) {
    if (token && isRejectedAsUnauthenticated(error)) session.expire();
    throw error;
  }
};

export const api = getSdk(new GraphQLClient(env.graphqlUrl), withSessionToken);

// Mirrors MAX_REFERRAL_REASON_LENGTH enforced by the API.
export const MAX_REASON_LENGTH = 500;
