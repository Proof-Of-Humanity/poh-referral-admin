# PoH Referral Admin

Admin dashboard for the Proof of Humanity referral programme. React 19, Vite, TanStack Query,
wagmi/AppKit for wallet sign-in, and a GraphQL client generated from the Atlas schema.

Admins use it to review referral attributions before a keeper bot pays them, to flag humanities
out of the programme, and to exempt trusted referrers from the monthly reward cap.

## Running it

```
yarn install
cp .env.example .env
yarn start:dev          # http://localhost:3100
```

The API environment is chosen in the UI, not at build time. Staging and production are compiled in;
setting `VITE_ATLAS_GRAPHQL_URL` adds a third "Local" option for working against a local Atlas.
Switching environments clears the session, because each one issues its own JWT.

| Environment | GraphQL endpoint |
| --- | --- |
| Staging | https://atlas.staging.kleros.link/graphql |
| Production | https://atlas.production.kleros.link/graphql |

Signing in needs a wallet holding the `pohadmin` role on the selected environment.
