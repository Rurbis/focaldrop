# @focaldrop/web

Next.js 16 (App Router) front of Focal Drop: the admin panel today, and the public site and client galleries of each agency later. See the [main README](../../README.md) for the whole project.

## Local setup

1. Start local Supabase from the repository root (`pnpm db:start`, see [`infra/supabase/README.md`](../../infra/supabase/README.md)).
2. Copy [`.env.example`](.env.example) to `apps/web/.env.local` and fill it with `API_URL` and `PUBLISHABLE_KEY` from `infra/supabase/.env.local`. Git ignores the file.
3. Create a user to sign in with. Public sign-up is closed (D94), so use the Auth admin API as the Supabase guide explains, until the seed of issue #15 creates the demo owner.
4. Run `pnpm --filter @focaldrop/web dev` and open <http://localhost:3000/admin>.

Password recovery emails arrive in Mailpit (<http://127.0.0.1:54324>). Local Supabase sends at most 2 emails per hour; past that, the form shows the rate-limit message.

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
