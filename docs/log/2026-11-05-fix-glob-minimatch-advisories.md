# fix(deps): move glob and minimatch to their patched majors

Issue: alertas de Dependabot #35 y #36 · PR: #85 · Autor: Rubén

## Decisiones

- **D-nueva · Un aviso sin exposición real no adelanta una versión mayor recién publicada** (precisa D131). La excepción de seguridad de D131 sigue para los parches y las versiones compatibles. Si el arreglo exige forzar una versión mayor con menos de 14 días y el aviso no nos alcanza, se prepara y se prueba el cambio, pero se mezcla al cumplirse los 14 días. La alerta queda abierta y visible hasta entonces, sin descartarla.

## Historial

- 2026-11-05: **Alertas #35 (`glob`) y #36 (`minimatch`) → PR #85: versiones corregidas con `overrides`.** Las dos actualizaciones de seguridad de Dependabot fallaron; su log solo se ve en la web y no lo revisé. La causa probable: el parche solo existe en `glob` 14 y `minimatch` 11, y OpenNext, ESLint, la CLI de Nest y los plugins de Sentry piden versiones anteriores. **Exposición:** ninguna encontrada. El aviso de `glob` afecta a quien usa `AbortSignal` para limitar una búsqueda, y ni Sentry, ni OpenNext ni `node-minify` lo pasan. El de `minimatch` exige un patrón del atacante, y aquí todos salen del repo. En la imagen de la API, `glob` solo llega por los plugins de empaquetado de `@sentry/node`, que la API no ejecuta. **Por qué no se mezcla ya:** son reescrituras publicadas el 2026-10-27, con una dependencia nueva creada un día antes, y correrían en el CI junto a los secretos de deploy.
- 2026-11-17: **Al día con `main` y listo para revisión.** Al revisar las fechas, el lockfile traía `@isaacs/nonrecursive-glob-match` 1.1.0, publicado el 2026-11-05 (12 días): `minimatch` 11 pide `^1.0.3`, y el lockfile tomó la más nueva el mismo día que salió. Un `override` más lo deja en 1.0.3 (2026-10-28). Frente a `main`, el lockfile solo agrega `glob` 14.0.3, `minimatch` 11.0.4, `path-scurry` 3.0.0 y `@isaacs/nonrecursive-glob-match` 1.0.3, todos con 14 días o más. En local pasan formato, lint, tipos, pruebas y build: 12 de 12 tareas.

## Tiempo

- Alertas #35 y #36 (R): sin estimado; real ≈ 0.75 h, más ≈ 0.25 h de la actualización del 2026-11-17.

## Pendientes

- **Quitar estos `overrides`** cuando OpenNext, ESLint, la CLI de Nest y Sentry acepten las versiones corregidas. Sentry 11.11.0 ya pide `glob` 14. El de `@isaacs/nonrecursive-glob-match` se quita cuando una versión más nueva cumpla 14 días.
