# @focaldrop/web

Next.js 16 (App Router) front of Focal Drop: the admin panel today, and the public site and client galleries of each agency later. See the [main README](../../README.md) for the whole project.

## Conventions

- **Interface texts live in [`src/i18n/es-MX.ts`](src/i18n/es-MX.ts)**, never inline in components (B5). A missing key is a compile error.
- **The admin panel is neutral** (D39): the same design for every agency. Nothing that identifies an agency goes in the code; it comes from the database.
- **Tailwind CSS v4** is configured in CSS ([`src/app/globals.css`](src/app/globals.css)); there is no `tailwind.config.js`.
- **Typed routes**: a `Link` to a route that does not exist fails `pnpm typecheck`.

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
