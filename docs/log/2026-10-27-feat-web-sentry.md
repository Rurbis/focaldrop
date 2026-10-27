# feat(web): report front-end errors to sentry with source maps

Issue: #22 · PR: #76 · Autor: Rubén

## Decisiones

- **D-nueva · Sentry en el front: errores del navegador y del Worker, con *source maps*** (precisa D86, D123 y D137) — F4, segundo PR de la #22.
  - **Qué reporta:** solo errores, sin trazas de rendimiento, Session Replay ni logs. La política de datos es la misma que la de la API: sin datos de usuario, cookies, encabezados, cuerpos ni *query strings*.
  - **Dónde:**
    - en el navegador, `instrumentation-client.ts`;
    - en el Worker, `worker.ts`, que envuelve con `withSentry` el *handler* de OpenNext (soporte oficial desde `@sentry/nextjs` 11.6.0);
    - en `next dev`, `instrumentation.ts`, que además reporta los errores de Server Components, Server Actions y rutas.
  - **El DSN** vive en la variable `NEXT_PUBLIC_SENTRY_DSN` de los Environments `staging` y `preview`. Next la incrusta en el navegador al compilar. Al Worker, en cambio, lo empaqueta Wrangler y no Next, así que el workflow le pasa el DSN como variable del Worker (`--var SENTRY_DSN`). Sin DSN, Sentry queda apagado.
  - **Source maps:** con el token de organización `SENTRY_AUTH_TOKEN` en los Environments, el build los sube y los borra de la salida, así que el navegador nunca los descarga. Sin token se salta la subida.
  - **Versión:** 11.7.0, la más reciente con los 14 días de D131 cumplidos; la API usa la 11.8.0.

## Historial

- 2026-10-27: **F4 → PR: Sentry del front (#22).** Probado en local: el login carga sin errores en la consola y Sentry se inicializa en el navegador (sin DSN no envía nada). `withSentryConfig` se importa de `@sentry/nextjs/config` en la versión 11. Una prueba fija la política de datos.

## Tiempo

- #22 F4, Sentry del front (R): estimado ≈ 1–2 h; real ≈ 1.5 h hasta el PR, con la investigación del soporte de Sentry en Cloudflare.

## Pendientes

- Rubén crea el token de organización en Sentry y lo guarda como `SENTRY_AUTH_TOKEN` en los Environments `staging` y `preview`.
