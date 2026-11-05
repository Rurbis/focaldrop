# fix(deps): move glob and minimatch to their patched majors

Issue: alertas de Dependabot #35 y #36 · PR: #85 · Autor: Rubén

## Decisiones

- **D-nueva · Un aviso sin exposición real no adelanta una versión mayor recién publicada** (precisa D131). La excepción de seguridad de D131 sigue para los parches y las versiones compatibles. Si el arreglo exige forzar una versión mayor con menos de 14 días y el aviso no nos alcanza, se prepara y se prueba el cambio, pero se mezcla al cumplirse los 14 días. La alerta queda abierta y visible hasta entonces, sin descartarla.

## Historial

- 2026-11-05: **Alertas #35 (`glob`) y #36 (`minimatch`) → PR #85: versiones corregidas con `overrides`.** Dependabot no pudo arreglarlas, porque el parche solo existe en `glob` 14 y `minimatch` 11, y OpenNext, ESLint, la CLI de Nest y los plugins de Sentry piden versiones anteriores. **Exposición:** ninguna encontrada. El aviso de `glob` afecta a quien usa `AbortSignal` para limitar una búsqueda, y ni Sentry, ni OpenNext ni `node-minify` lo pasan. El de `minimatch` exige un patrón del atacante, y aquí todos salen del repo. En la imagen de la API, `glob` solo llega por los plugins de empaquetado de `@sentry/node`, que la API no ejecuta. **Por qué no se mezcla ya:** son reescrituras publicadas el 2026-10-27, con una dependencia nueva creada un día antes, y correrían en el CI junto a los secretos de deploy.

## Tiempo

- Alertas #35 y #36 (R): sin estimado; real ≈ 0.75 h.

## Pendientes

- **Mezclar este PR a partir del 2026-11-16,** cuando `minimatch` 11.0.4 cumpla 14 días, con `main` al día y el CI otra vez en verde.
- **Quitar estos `overrides`** cuando OpenNext, ESLint, la CLI de Nest y Sentry acepten las versiones corregidas. Sentry 11.11.0 ya pide `glob` 14.
