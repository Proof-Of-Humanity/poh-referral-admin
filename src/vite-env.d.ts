/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ATLAS_GRAPHQL_URL?: string;
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string;
  readonly VITE_DEV_BURNER_PRIVATE_KEY?: string;
}
