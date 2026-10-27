# feat(web): report browser errors to sentry with source maps

Issue: #22 · PR: #76 · Autor: Rubén

## Decisiones

- **D-nueva · Sentry en el front solo en el navegador, con *source maps*; los errores del servidor quedan en Workers Logs** (precisa D86, D123 y D137) — F4, segundo PR de la #22.
  - **Qué reporta:** errores del navegador, sin trazas de rendimiento, Session Replay ni logs. La política de datos es la misma que la de la API: sin datos de usuario, cookies, encabezados, cuerpos ni *query strings*.
  - **El DSN** vive en la variable `NEXT_PUBLIC_SENTRY_DSN` de los Environments `staging` y `preview`, y Next la incrusta al compilar. Sin DSN, Sentry queda apagado.
  - **Source maps:** con el token de organización `SENTRY_AUTH_TOKEN` en los Environments, el build los sube y los borra de la salida, así que el navegador nunca los descarga. Sin token se salta la subida.
  - **Por qué no en el servidor:** se probó el soporte oficial de Sentry para Next en Cloudflare (`withSentry` de `@sentry/nextjs/cloudflare` más `onRequestError`). El Worker pasó de 2,186 a **3,684 KiB** comprimido, por encima del límite de 3,072 KiB de Workers Free: Cloudflare rechazaría el deploy. Los errores del servidor quedan en Workers Logs, ya activo. **Se reconsidera** con Workers Paid (10 MiB) al lanzar, o si Sentry saca un SDK de servidor más ligero.
  - **Versión:** 11.7.0, la más reciente con los 14 días de D131 cumplidos; la API usa la 11.8.0.

## Historial

- 2026-10-27: **F4 → PR: Sentry del front (#22).** El primer intento, con navegador y servidor, rebasó el límite de tamaño del Worker en la preview, así que quedó solo el navegador. Probado en local: el login carga sin errores en la consola y Sentry se inicializa. `withSentryConfig` se importa de `@sentry/nextjs/config` en la versión 11. Una prueba fija la política de datos.

## Tiempo

- #22 F4, Sentry del front (R): estimado ≈ 1–2 h; real ≈ 2 h hasta el PR, con la investigación del soporte en Cloudflare y la medición del tamaño.

## Pendientes

- Rubén crea el token de organización en Sentry y lo guarda como `SENTRY_AUTH_TOKEN` en los Environments `staging` y `preview`.
- El Worker ya usa el 71 % del límite de Workers Free (2,186 de 3,072 KiB), y el hito 1 le agrega la galería. Hay que vigilarlo: Workers Paid (US$5 al mes) puede hacer falta antes del lanzamiento.
