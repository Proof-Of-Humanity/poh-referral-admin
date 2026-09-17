const required = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing ${key} in .env`);
  return value;
};

export type ApiEnvironmentName = 'local' | 'staging' | 'production';

const API_ENVIRONMENT_KEY = 'poh-admin.api-environment';

// Deployed Atlas stages resolve as <project>.<stage>.kleros.link; `local` exists only when .env points at one.
const graphqlUrls: Record<ApiEnvironmentName, string | undefined> = {
  local: import.meta.env.VITE_ATLAS_GRAPHQL_URL,
  staging: 'https://atlas.staging.kleros.link/graphql',
  production: 'https://atlas.production.kleros.link/graphql',
};

export const apiEnvironmentLabels: Record<ApiEnvironmentName, string> = {
  local: 'Local',
  staging: 'Staging',
  production: 'Production',
};

export const selectableApiEnvironments = (Object.keys(graphqlUrls) as ApiEnvironmentName[]).filter(
  (name) => graphqlUrls[name],
);

const storedApiEnvironment = localStorage.getItem(API_ENVIRONMENT_KEY) as ApiEnvironmentName | null;

export const apiEnvironment: ApiEnvironmentName =
  storedApiEnvironment && graphqlUrls[storedApiEnvironment]
    ? storedApiEnvironment
    : (selectableApiEnvironments[0] ?? 'staging');

export const rememberApiEnvironment = (name: ApiEnvironmentName) => localStorage.setItem(API_ENVIRONMENT_KEY, name);

export const env = {
  graphqlUrl: graphqlUrls[apiEnvironment]!,
  walletConnectProjectId: required('VITE_WALLET_CONNECT_PROJECT_ID'),
  devBurnerPrivateKey: import.meta.env.DEV
    ? (import.meta.env.VITE_DEV_BURNER_PRIVATE_KEY as string | undefined)
    : undefined,
};
