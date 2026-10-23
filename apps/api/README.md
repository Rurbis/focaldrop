# @focaldrop/api

NestJS 12 API for Focal Drop, using ESM and the monorepo's shared TypeScript,
ESLint and Prettier configuration.

`GET /health` returns HTTP 200 with the API status and the version declared in
this package's `package.json`:

```json
{ "status": "ok", "version": "0.0.1" }
```

The response is validated with `HealthResponseSchema` from `@focaldrop/shared`.
The package version is loaded once in `src/constants/app.constants.ts`.
This endpoint checks that the API responds; it does not check database connectivity.

## Development

Run these commands from the repository root, with the Node and pnpm versions
pinned by the project:

```sh
pnpm install --frozen-lockfile
```

Copy this app's `.env.example` to `apps/api/.env`, then start the workspace:

```sh
pnpm dev
```

The health endpoint is <http://localhost:3001/health>. Turbo builds workspace
dependencies before starting their consumers. To run only the API in watch mode:

```sh
pnpm exec turbo run dev --filter=@focaldrop/api
```

The API loads `apps/api/.env` when present. Variables supplied by the environment
take precedence. Zod validates the configuration during startup:

| Variable              | Required | Values / default                                                                  |
| --------------------- | -------- | --------------------------------------------------------------------------------- |
| `NODE_ENV`            | Yes      | `development`, `test` or `production`                                             |
| `PORT`                | No       | Integer from 1 to 65535; defaults to `3001`                                       |
| `SENTRY_DSN`          | No       | HTTP(S) DSN for the existing API project; empty disables Sentry                   |
| `SENTRY_ENVIRONMENT`  | No       | Deployment label, e.g. `staging`; defaults to `NODE_ENV`                          |
| `DATABASE_URL`        | Yes      | PostgreSQL runtime connection using `app_api`; never the migrations administrator |
| `DEFAULT_AGENCY_SLUG` | No       | Valid agency slug used for unknown/missing hosts outside production               |

Invalid configuration stops startup and identifies the affected variable.
Restart the API after changing environment variables.

## Logs and error reporting

Nest logs and startup failures use one JSON object per line, with a level,
timestamp, context and message. Colors are disabled so log collectors can parse
the output directly.

When `SENTRY_DSN` is present, `src/main.ts` initializes `@sentry/nestjs` before
dynamically loading the Nest bootstrap. This order lets the SDK instrument ESM
modules before they load. The global Sentry exception filter reports unexpected
server errors; expected HTTP errors such as 400 responses are not reported.
Sentry 11 replaced `sendDefaultPii` with
[`dataCollection`](https://github.com/getsentry/sentry-javascript/blob/11.8.0/MIGRATION.md).
Our policy in `src/constants/sentry.constants.ts` disables automatic user info,
cookies, headers, bodies, query parameters and integration payload collection.
Performance tracing is disabled, and releases use `focaldrop-api@<package version>`.

Issue #9 already provisioned the Sentry API project. For staging, use its DSN
from the team's secret store and set `SENTRY_ENVIRONMENT=staging`; do not create
a second project or commit the DSN. A post-deploy check in the real Sentry project
still requires that environment's DSN and access to its dashboard.

## Database (issue #11)

The milestone-0 schema lives in `src/db/schema/`: `agencies`, `agency_domains`,
`profiles` and `agency_members`. Application IDs use UUID v7; a profile keeps the
identifier assigned by Supabase Auth. `verified_at`, notification preferences and
storage-policy acceptance are included now as required by the data design.

After starting [local Supabase](../../infra/supabase/README.md), copy the database
settings from `.env.example` to `apps/api/.env` and run from the repository root:

```sh
pnpm db:migrate
pnpm db:generate --name=describe_the_change
```

`db:migrate` requires `MIGRATIONS_DATABASE_URL`; it never uses `DATABASE_URL`.
Use the administrator/session connection for DDL, never the transaction pooler.
Both root commands build `@focaldrop/shared` first, so they also work in a fresh
clone and after changes to its exports (D120).
`db:generate` reads all exports from `src/db/schema/index.ts` and needs no database credentials. Review and commit the generated SQL,
snapshot and journal together. The first migration is `drizzle/0001_platform.sql`;
its final section contains the custom layer-0 grants and policies (D60).

Supabase owns `auth.users`, `anon`, `authenticated` and `service_role`; migrations do not recreate
them. Every platform table has RLS enabled, no grants to `PUBLIC`, `anon`,
`authenticated` or `service_role` (including `TRUNCATE`, `REFERENCES` and `TRIGGER`), and a CRUD policy for `app_api`. The runtime role has no superuser,
role-creation or RLS-bypass privileges. Its password is deliberately absent from
migrations: the local seed configures a Docker-only password; staging must
provision its own password outside Git. Layer 0 deliberately allows `app_api`
across agencies; guards/repositories implement layer 1 (#12–#14).

`pnpm test` skips integration suites when `TEST_DATABASE_URL` is absent outside CI.
In CI the suites always run and fail if that variable is missing; the workflow
explicitly supplies both `TEST_DATABASE_URL` and `MIGRATIONS_DATABASE_URL`.
Integration tests require `TEST_DATABASE_URL` pointing to
a loopback PostgreSQL 17 server with `CREATEDB`. Each suite creates and removes its
own `focaldrop_test_*` database and supplies a minimal external Auth fixture. It
checks a fresh migration, constraints, account-deletion cascades, permissions,
RLS and a repeated migration. The `app_api` exercise grants temporary `SET ROLE`
membership inside its transaction and always rolls it back, checking that the
original membership is restored. This also works with Supabase's non-superuser
`postgres` on PostgreSQL 16+. It never resets the database supplied in the URL.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
pnpm --filter @focaldrop/api test:integration
```

`createDatabase()` uses `prepare: false` for Supabase's transaction pooler. It
returns a typed Drizzle database and the underlying client, which consumers must
close on shutdown. The health endpoint remains independent of database access.

## Tenant resolution (issue #13)

Next forwards the original site's host in `X-Tenant-Host`; the API's own `Host`
header is not used to select an agency. For example:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3001/public/tenant' -Headers @{
  'X-Tenant-Host' = 'LOCALHOST:3000'
}
```

After the local migration/seed, this returns the public `demo` agency:

```json
{
  "id": "<agency UUID>",
  "slug": "demo",
  "name": "Demo agency",
  "status": "active",
  "timezone": "America/Mexico_City",
  "locale": "es-MX",
  "currency": "MXN"
}
```

`PublicTenantSchema` in `@focaldrop/shared` is the response contract. Notification
email/preferences, retention and account-policy settings are not exposed.

- DNS names/IPv4 are lowercased, a port and a final DNS dot are removed.
  Malformed values, URLs, lists/duplicate headers and literal IPv6 are rejected
  with 400. Stored hostnames currently exclude colons.
- A registered host resolves through `agency_domains`. Unknown/missing hosts can
  use `DEFAULT_AGENCY_SLUG` only when `NODE_ENV` is `development` or `test`.
  Without an available default they return 404. Suspended agencies return 404.
- `NODE_ENV=production` always disables fallback, including staging running a
  production build. Register its real hostname; `SENTRY_ENVIRONMENT` does not
  change tenant rules. Malformed headers never fall back.
- Successful resolutions are cached per normalized host for five minutes in
  each API process, with at most 1,000 entries (oldest inserted entry evicted).
  No external cache is required. Changes/suspensions may take up to five minutes
  to appear on an instance. Misses and database failures are not cached.
- HTTP responses on tenant routes, including errors, use `Cache-Control: no-store`
  to prevent shared caches mixing hosts. Next's explicit tagged application
  cache belongs to #19.

`TenantMiddleware` runs on `/public` and `/admin`, including nested routes,
before guards/controllers. It resolves the agency, then opens an isolated
`nestjs-cls` context for the rest of that request. Other modules can import
`TenancyModule` and inject `TenantContext`; `get()` fails explicitly if no
context exists. Cached public objects are frozen so one request cannot mutate
another request's agency.

The host selects public context, not authorization. JWT authentication and
membership/role checks remain in #12 and #14; callers must never treat a supplied
tenant host as permission to access private data. These discovery queries are
the exception to requiring an already-known `agency_id`.

`DatabaseModule` owns one runtime pool per process and closes it during Nest
shutdown. `GET /health` does not resolve a tenant or query PostgreSQL. The API
still requires a valid runtime connection URL at startup, but the driver connects
lazily, so health remains available during a database outage.

Tests cover normalization, fallback, TTL/eviction, public projection, failures
and deterministically interleaved requests. PostgreSQL integrations exercise the
real repository and HTTP endpoint with `SET LOCAL ROLE app_api`; temporary
membership grants roll back with their transactions. Existing health/Sentry
e2e tests replace the pool and need no running database.

## Local demo (issue #15)

With Docker and Supabase running, first generate `infra/supabase/.env.local` as
described in the [local guide](../../infra/supabase/README.md). Copy the API env
example if absent, then use the root commands:

```sh
pnpm db:migrate
pnpm db:seed
```

| Item                       | Synthetic local value             |
| -------------------------- | --------------------------------- |
| Agency / hostname          | `demo` / `localhost`              |
| Owner email                | `owner@focaldrop.test`            |
| Owner password             | `Focaldrop-local-only-2026!`      |
| Runtime DB role / password | `app_api` / `focaldrop_local_api` |

The seed creates the owner through the **Auth administration API**, confirms the
email, and creates the profile and owner membership. It never inserts passwords
into `auth.users` or uses the disabled Data API. IDs remain stable on reruns;
local edits to the demo agency are preserved. `localhost` belonging to another
agency, or the demo email belonging to an unmarked Auth account, stops the seed
instead of taking them over. A transaction/advisory lock prevents concurrent
seeds from duplicating data. The profile is not a platform administrator.

`NODE_ENV=development` is required. Seed/reset accepts only loopback Supabase
on ports 54321/54322 and the `postgres` database. Remote URLs, alternate databases,
query-string connection overrides and a non-administrator migration connection
are rejected before connecting. Admin keys come from the ignored CLI env file
(or `SUPABASE_SECRET_KEY`); the explicit key takes precedence, followed by the
CLI's modern `SECRET_KEY`, with legacy `SERVICE_ROLE_KEY` only as a fallback
(D121). Modern secrets are sent only in `apikey`; legacy JWTs also use the
`Authorization` header. Keys and tokens are never logged. These credentials
must never be reused in staging or production.

```sh
pnpm db:reset
```

**Reset deletes all data in this project's local Supabase, including Auth users.**
After validating the local configuration, it invokes `supabase db reset --local`
against `infra`, applies the Drizzle history, and provisions the demo again. It
never selects a linked project or reads a remote URL for the subsequent migration.
The seed does not recreate galleries, clients or files: those tables belong to
later milestones (D89).

All four root database commands build `@focaldrop/shared` before running the API
script (D120). No manual shared build is needed for the README's quick start.
CI migrates a fresh clone without `shared/dist`, deliberately makes that build
obsolete before `pnpm db:seed`, then runs `db:verify-local` against a disposable
**real Supabase** stack. It also runs the integration suites with Supabase's
non-superuser `postgres`, resets and verifies again. This checks stable IDs,
counts, password login (200), all revoked client/service-role table privileges
and an actual connection as `app_api`. Unit tests reject unsafe destinations;
Postgres integration tests cover idempotence, concurrent runs and collisions.
The Supabase job runs only when API, shared, Supabase or relevant root/build/CI
files change, so unrelated web or documentation PRs skip it.

## Checks and production build

```sh
pnpm exec turbo run lint typecheck test build
pnpm --filter @focaldrop/api start:prod
```

`test` runs configuration and SDK initialization unit tests, plus HTTP end-to-end
tests with Vitest. The e2e tests create their own servers on available ports; they
do not need `pnpm dev` running. `/health` is checked against the version read
independently from this package's `package.json`. Error-reporting tests exercise
the actual SDK and global exception filter with an in-memory transport, so they
never send events to Sentry or require a real DSN. The synthetic error routes exist
only in the test module.

`tsconfig.json` covers source, tests and Vitest configuration. The build uses
`tsconfig.build.json` to compile only application source into `dist/`, with
`src/main.ts` emitted as `dist/main.js`.

Production deployments must retain this package's `package.json` alongside
`dist/`, because the API reads its version at startup.

Formatting is managed from the repository root with `pnpm format:check` and
`pnpm format`.
