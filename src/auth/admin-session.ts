import { decodeJwt } from 'jose';

// AtlasProvider (@kleros/kleros-app) signs in and stores the JWT here, JSON-encoded; poh-web reads
// it the same way in config/atlas.ts. All this adds is the one thing the provider has no notion of:
// roles, which is the whole question an admin dashboard has to answer.
const ATLAS_TOKEN_KEY = 'authToken';

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

export const discardAtlasToken = () => sessionStorage.removeItem(ATLAS_TOKEN_KEY);
