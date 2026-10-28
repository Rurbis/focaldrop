# @focaldrop/web

Next.js 16 (App Router) front of Focal Drop: the admin panel today, and the public site and client galleries of each agency later. See the [main README](../../README.md) for the whole project.

## Local setup

1. Start local Supabase from the repository root (`pnpm db:start`, see [`infra/supabase/README.md`](../../infra/supabase/README.md)).
2. Copy [`.env.example`](.env.example) to `apps/web/.env.local` and fill it with `API_URL` and `PUBLISHABLE_KEY` from `infra/supabase/.env.local`. Git ignores the file.
3. Create a user to sign in with. Public sign-up is closed (D94), so use the Auth admin API as the Supabase guide explains, until the seed of issue #15 creates the demo owner.
4. Run `pnpm --filter @focaldrop/web dev` and open <http://localhost:3000/admin>.

Password recovery emails arrive in Mailpit (<http://127.0.0.1:54324>). Local Supabase sends at most 2 emails per hour; past that, no email arrives, but the form still shows the same neutral answer, so it never reveals whether an account exists.

## Admin access (issue #18)

| Route                    | What it does                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `/admin/login`           | Email and password. Redirects to `/admin` when there is already a session.                                                 |
| `/admin/forgot-password` | Sends the recovery link. Answers the same whether the email exists or not.                                                 |
| `/admin/auth/confirm`    | Target of the recovery email: verifies the one-time token hash and signs the user in.                                      |
| `/admin/reset-password`  | Sets the new password. Needs the session created by the recovery link.                                                     |
| `/admin/*`               | The `(panel)` layout requires a session; without one the visitor goes to `/admin/login`. **Salir** signs out this browser. |

- **[`src/proxy.ts`](src/proxy.ts) only refreshes the session** (D40), and only on `/admin/*`: the public site never pays for auth.
- **Supabase is used from the server only.** There is no browser client, so the session cookie is `httpOnly` and scripts cannot read it.
- **`getClaims()` checks the session** by verifying the JWT locally with the project's public keys (ES256). Permissions are decided by Nest (D57), not here.
- **Recovery links carry a token hash**, not a PKCE code, so they work on any device. The email template lives in [`infra/supabase/templates/recovery.html`](../../infra/supabase/templates/recovery.html); staging and production need the same template in their Auth settings.

## Structure

| Folder               | Contents                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| `src/app/`           | Routes only: pages, layouts and route handlers, kept thin.                      |
| `src/features/`      | Code of each area, such as `auth/`: Server Actions, schemas, components, tests. |
| `src/components/ui/` | Generic pieces with no business logic (fields, buttons, messages).              |
| `src/lib/`           | Clients and configuration: Supabase clients, validated environment.             |
| `src/i18n/`          | The `es-MX` dictionary.                                                         |

## Conventions

- **Interface texts live in [`src/i18n/es-MX.ts`](src/i18n/es-MX.ts)**, never inline in components (B5). A missing key is a compile error. Zod schemas carry no messages (D120): forms map errors to dictionary keys.
- **The admin panel is neutral** (D39): the same design for every agency. Nothing that identifies an agency goes in the code; it comes from the database.
- **Tailwind CSS v4** is configured in CSS ([`src/app/globals.css`](src/app/globals.css)); there is no `tailwind.config.js`.
- **Typed routes**: a `Link` or `redirect` to a route that does not exist fails `pnpm typecheck`.

## Scripts

| Script                                   | What it does                                      |
| ---------------------------------------- | ------------------------------------------------- |
| `pnpm --filter @focaldrop/web dev`       | Development server on http://localhost:3000       |
| `pnpm --filter @focaldrop/web build`     | Production build                                  |
| `pnpm --filter @focaldrop/web lint`      | ESLint with the Next.js and React hooks rules     |
| `pnpm --filter @focaldrop/web typecheck` | Generates the route types and runs `tsc --noEmit` |
| `pnpm --filter @focaldrop/web test`      | Unit tests with Vitest                            |

The `cf:*` scripts build and deploy the Cloudflare Worker. They work only on Linux (CI, or WSL on Windows):

| Script       | What it does                                                       |
| ------------ | ------------------------------------------------------------------ |
| `cf:build`   | Builds the Worker with OpenNext into `.open-next/`                 |
| `cf:size`    | Bundles it without deploying and prints its compressed size        |
| `cf:local`   | Runs the built Worker in the local Workers runtime                 |
| `cf:deploy`  | Deploys the staging Worker (CI only, on merges to `main`)          |
| `cf:preview` | Publishes a Worker Preview (CI only, `--name pr-<number>` on a PR) |

## Deployment

[`deploy-web.yml`](../../.github/workflows/deploy-web.yml) builds the Worker on every pull request and fails if it grows past 2.75 MiB compressed (the Workers Free limit is 3 MiB). With deployment setup complete, pull requests from this repo publish the Preview `pr-<number>`, deleted when the pull request closes; merges to `main` deploy staging (D137). Public variables such as the Supabase URL come from the `staging` and `preview` GitHub Environments at build time.

## Tenant resolution and API forwarding — F1

Set `API_URL` in `.env.local` to the root URL of Nest. Local development uses `http://127.0.0.1:3001`; external URLs require HTTPS and cannot contain credentials, a path, a query or a fragment. The variable is server-only.

| Route                            | Behavior                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/public/tenant`         | Resolves the agency from the request's `Host` header. Returns only `PublicTenantSchema` fields. |
| `/api/admin/*`                   | Forwards to Nest with the verified Supabase token and normalized host.                          |
| `POST /api/cache/agency-domains` | Invalidates the fixed Next cache tag with a separate maintenance credential.                    |

Next replaces `Authorization` and `X-Tenant-Host`; it never forwards browser cookies or trusts a browser-supplied tenant/forwarded-host header. Mutations require an exact same-origin `Origin`, accept JSON up to 100 KiB (including chunked bodies), and reject compressed input. The upstream URL comes exclusively from configuration and redirects are rejected. Only JSON responses and the `Retry-After` hint are forwarded; upstream cookies, CORS and encoding/length headers are omitted. Other prefixes, including `internal` and `cron`, are not exposed.

`getSession()` only obtains the candidate token; `getClaims(token)` verifies it before forwarding. Nest remains responsible for JWT verification and agency membership/role authorization (F3/F5). The bridge does not grant membership or add business operations.

Public agency results use `unstable_cache` with the API URL and normalized host as arguments and `agency-domains` as the invalidation tag. Only validated, active agencies are stored. Lookup failures do not create cache entries. HTTP responses, including errors, use `Cache-Control: private, no-store`; authenticated responses never enter the data cache.

The 60-second interval uses Next's stale-while-revalidate behavior, not a strict freshness deadline during upstream failures. `revalidateTag('agency-domains', { expire: 0 })` expires the Next entry for the next lookup. **It does not clear Nest's five-minute in-memory cache.** Direct database changes can remain visible until that cache expires; tenant discovery must never be the authorization decision.

The maintenance endpoint requires `Authorization: Bearer <secret>`. Set `AGENCY_CACHE_REVALIDATION_SECRET` to a random 32–256 character value using ASCII letters, digits, `_` or `-`; an empty value disables the endpoint with 404. Keep it in an ignored local environment file or the environment's secret store, never in client code or the repository.

### Verification

```bash
pnpm exec turbo run lint typecheck test build --filter=@focaldrop/web...
pnpm --filter @focaldrop/web test:integration:f1
pnpm --filter @focaldrop/web test:deployment
```

The integration verifier starts a disposable HTTP API and the **compiled Next server**, with synthetic data and a generated maintenance credential. It checks cache reuse, host separation, tag invalidation, ignored spoofed headers, uncached lookup failures, public field filtering and HTTP boundaries. It never uses staging, the developer's database or a real Supabase session. Unit tests cover verified-token forwarding, body limits, redirects, CSRF and configuration validation.

### One-time Cloudflare cache setup

This advances R2 activation from D90 to finish F1. It creates cache storage only; business data stays in Supabase. The account/infrastructure owner provisions:

```bash
pnpm --filter @focaldrop/web exec wrangler r2 bucket create focaldrop-web-cache-staging
pnpm --filter @focaldrop/web exec wrangler r2 bucket create focaldrop-web-cache-preview
pnpm --filter @focaldrop/web exec wrangler d1 create focaldrop-web-tags-staging
pnpm --filter @focaldrop/web exec wrangler d1 create focaldrop-web-tags-preview
```

In **both** GitHub Environments (`staging` and `preview`), configure:

| Setting                            | Kind     | Value                                                      |
| ---------------------------------- | -------- | ---------------------------------------------------------- |
| `WEB_CACHE_STAGING_D1_ID`          | Variable | ID of `focaldrop-web-tags-staging`                         |
| `WEB_CACHE_PREVIEW_D1_ID`          | Variable | ID of `focaldrop-web-tags-preview`, different from staging |
| `AGENCY_CACHE_REVALIDATION_SECRET` | Secret   | A random credential, different between environments        |

The existing account-scoped Cloudflare token also needs R2 storage read/write and D1 edit access for the cache resources. `API_URL` is the already-public Cloud Run staging URL in Wrangler's server variables.

`wrangler.jsonc` contains two **local-only SQLite fixture IDs** so builds/local Worker development work without account credentials. The deployment wrapper rejects those IDs, validates setup before any remote command, and writes real bindings to an ignored `.wrangler/f1-<target>.json`. It sends the maintenance credential over stdin, never as an argument or config-file value. Use `cf:deploy` and `cf:preview` rather than bypassing the wrapper with a direct Wrangler deploy.

The wrapper uses OpenNext to populate R2 and initialize the D1 schema. `env.cache-preview` is only the population target for preview storage. Staging and previews use separate resources; preview cache keys are partitioned by the explicit `pr-<number>-<commit>-<run>-<attempt>` build ID. Preview service bindings stay empty so they cannot revalidate against staging. F1 adds function-result caching, not page ISR or a page-revalidation queue.

The Worker build, integration verifier and size budget run even without deployment setup. A preview lacking the new configuration is **not published** and the workflow summary lists what is missing. Staging deployment fails before remote writes when setup is incomplete. Skipping publication is not a successful cache rollout.

Before enabling publication/merging the web PR, deploy #61 and provision the agency/domain from #71, plus the fallback when needed. The smoke test now requires `/api/public/tenant` to return 200. Verify actual R2/D1 cache reuse and invalidation on the published Worker before closing #13; the local Next verifier alone does not prove the Cloudflare adapter's runtime behavior.
