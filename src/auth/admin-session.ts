import { decodeJwt } from 'jose';

import { apiEnvironment } from '../config/env';

// AtlasProvider (@kleros/kleros-app) signs in and stores the JWT here, JSON-encoded; poh-web reads
// it the same way in config/atlas.ts. All this adds is the one thing the provider has no notion of:
// roles, which is the whole question an admin dashboard has to answer.
const ATLAS_TOKEN_KEY = 'authToken';
const TOKEN_STAGE_KEY = 'poh-admin.token-stage';

export const atlasToken = (): string | null => {
  const stored = sessionStorage.getItem(ATLAS_TOKEN_KEY);
  try {
    return stored ? (JSON.parse(stored) as string) : null;
  } catch {
    return null;
  }
};

/** Null when signed out or the token is spent. Unverified: the signature is the API's to check. */
export const atlasClaims = () => {
  const token = atlasToken();
  try {
    const claims = token ? decodeJwt<{ roles?: string[] }>(token) : null;
    return claims?.exp && claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
};

export const isPohAdmin = () => atlasClaims()?.roles?.includes('pohadmin') ?? false;

export const discardAtlasToken = () => {
  sessionStorage.removeItem(ATLAS_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_STAGE_KEY);
};

/** Records which Atlas the token in this tab was minted by. Call after a successful sign-in. */
export const rememberTokenStage = () => sessionStorage.setItem(TOKEN_STAGE_KEY, apiEnvironment);

/**
 * The chosen environment lives in localStorage and is shared by every tab; the token lives in
 * sessionStorage and is not. So another tab switching stage can leave this one holding a token
 * minted elsewhere, and Atlas writes a token it rejects into its own logs verbatim — which would
 * put a live production credential in staging's logs. Checked once at boot, before anything reads.
 */
export const discardTokenFromAnotherStage = () => {
  if (sessionStorage.getItem(ATLAS_TOKEN_KEY) === null) return;
  if (sessionStorage.getItem(TOKEN_STAGE_KEY) === apiEnvironment) return;
  discardAtlasToken();
};
