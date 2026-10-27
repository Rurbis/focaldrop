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

[`deploy-web.yml`](../../.github/workflows/deploy-web.yml) builds the Worker on every pull request and fails if it grows past 2.75 MiB compressed (the Workers Free limit is 3 MiB). Pull requests from this repo publish the Preview `pr-<number>`, deleted when the pull request closes; merges to `main` deploy staging (D137). Public variables such as the Supabase URL come from the `staging` and `preview` GitHub Environments at build time.

## Error reporting (issue #22)

`@sentry/nextjs` reports errors to the Sentry project `web`, with no tracing, Session Replay or logs, and the same data collection policy as the API: no user info, cookies, headers, bodies or query strings ([`src/lib/sentry/options.ts`](src/lib/sentry/options.ts)). Without a DSN it stays off, so local development and pull requests from forks send nothing.

| Where                | File                                                                                                                 | DSN from                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Browser              | [`src/instrumentation-client.ts`](src/instrumentation-client.ts)                                                     | `NEXT_PUBLIC_SENTRY_DSN`, inlined at build time                                                             |
| Cloudflare Worker    | [`worker.ts`](worker.ts), the Worker entry: OpenNext's handler wrapped with `withSentry`                             | The `SENTRY_DSN` Worker variable that `deploy-web.yml` passes, because Wrangler bundles this file, not Next |
| `next dev` (Node.js) | [`src/lib/sentry/server.ts`](src/lib/sentry/server.ts), loaded by [`src/instrumentation.ts`](src/instrumentation.ts) | `NEXT_PUBLIC_SENTRY_DSN`                                                                                    |

`instrumentation.ts` also reports errors of Server Components, Server Actions and route handlers (`onRequestError`). When CI has `SENTRY_AUTH_TOKEN`, an organization token stored in the `staging` and `preview` Environments, the build uploads the source maps to Sentry and deletes them from the output, so the browser never downloads them. Without the token it skips the upload.
