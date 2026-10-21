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
take precedence. Zod validates the configuration before Nest starts:

| Variable             | Required | Values / default                                                |
| -------------------- | -------- | --------------------------------------------------------------- |
| `NODE_ENV`           | Yes      | `development`, `test` or `production`                           |
| `PORT`               | No       | Integer from 1 to 65535; defaults to `3001`                     |
| `SENTRY_DSN`         | No       | HTTP(S) DSN for the existing API project; empty disables Sentry |
| `SENTRY_ENVIRONMENT` | No       | Deployment label, e.g. `staging`; defaults to `NODE_ENV`        |

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
migrations: the local seed (#15) configures a Docker-only password; staging must
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
