# chore(deps): keep vitest's companion packages on its major

PR: #98 · Autor: Rubén

## Historial

- 2026-11-17: **Dependabot ignora también las versiones mayores de `@vitest/*` → PR #98.** El grupo del #93 subía `@vitest/coverage-v8` de 4.1.12 a 5.0.5 mientras `vitest` sigue en 4, como fija la D120 por el pool de Workers. `@vitest/coverage-v8` 5.0.5 exige `vitest` 5.0.5 exacto. Con esa mezcla, `pnpm --filter @focaldrop/api test:cov` falla con 12 errores (`coverageFilesDirectory is required`). La CI del #93 salió en verde solo porque en `main` la cobertura todavía no corre, pero el #92 (F5) la vuelve obligatoria. La regla nueva va junto a la de `vitest` y se quita con ella.
- Revisión completa del #93 (31 actualizaciones). Todo lo demás pasa en local, en Windows: formato, lint, tipos, build, 143 pruebas unitarias y 50 HTTP de la API, 150 de la web, 56 de `shared` y el verificador de F1. Las dos versiones mayores restantes se probaron contra una Supabase local desechable:
  - **`postgres` 4.0.0** (reescritura del driver): la migración y las 19 integraciones pasan. Los cambios que más riesgo tenían no nos afectan: todas las columnas de fecha son `timestamptz` y no usamos `sql.array()`.
  - **CLI de Supabase 3.0.0:** `start`, `status --output env` (las mismas variables), `db reset --local` y `stop` funcionan. Avisa de dos cosas que se van en la v4: `--local` en `db reset`, que usa `reset.cli.ts`, y `[auth.email] enable_signup`/`[auth.sms] enable_signup`, que pasan a `enabled`.
  - Los 168 paquetes nuevos del lockfile tienen 14 días o más (D131).

## Tiempo

- Revisión del #93 y esta regla (R): sin estimado; real ≈ 1 h, con las pruebas contra Supabase.

## Pendientes

- **Al mezclar este PR:** pedirle a Dependabot que rehaga el #93 (`@dependabot recreate`). Conviene después del #97 (Next 16.4.5) y del #85, que tocan el mismo lockfile.
- **Antes de la CLI de Supabase 4:** quitar `--local` de `apps/api/src/db/reset.cli.ts` y de `infra/supabase/README.md`, y cambiar `enable_signup` por `enabled` en `[auth.email]` y `[auth.sms]` de `infra/supabase/config.toml`.
- **Overrides que sobran con el #93:** Nest 12.3.2 ya fija `multer` 2.5.0, y el miniflare de wrangler 4.156.1 ya trae `sharp` 0.35.5 y `undici` 7.30.1. Se pueden quitar los tres de `pnpm-workspace.yaml` después de mezclar el #93.
