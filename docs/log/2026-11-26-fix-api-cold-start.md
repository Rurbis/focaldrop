# Mitigar arranque en frío de la API en Cloud Run

Issue: #107 · Autor: Fabian

## Historial

- 2026-11-26: **mitigación del arranque en frío en Cloud Run y el puente web (#107):**
  - **UptimeRobot (Rubén):** monitor cada 5 min activo sobre `GET /health` de staging (y de la web), con una primera medición en frío de `/health` en 8.6 s antes de encender el monitor.
  - **Cloud Run (`deploy-api.yml`):** se habilita `--cpu-boost` (*Startup CPU Boost*, costo despreciable dentro del nivel gratuito según ADR-0010) manteniendo `--max-instances=2` y escala a cero (D124).
  - **NestJS (`main.ts`, `bootstrap.ts`):** se registra un evento JSON estructurado `api.started` con `startupMs` y `nestStartupMs` al escuchar en el puerto para comparar el tiempo de arranque antes y después del boost frente a `container/startup_latencies` en Cloud Monitoring.
  - **Web (`apps/web/src/lib/api/fetch.ts`):** se amplía el timeout de 10 s a 20 s y se agrega 1 reintento automático con espera corta (250 ms) **solo para peticiones `GET`**, evitando duplicar mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) en el puente `/api/admin/*` (D148). Validado con pruebas unitarias nuevas en `apps/web/src/lib/api/fetch.test.ts`.

## Tiempo

- Sin estimado en la issue; ≈ 1 h asistida.

## Pendientes

- Anotar en Cloud Monitoring (`container/startup_latencies`) y en los logs de Nest (`startupMs`) el antes y después de desplegar `--cpu-boost` en staging.
- Completar la verificación en staging tras mezclar: (a) arranque en frío forzado con el monitor de UptimeRobot en pausa o tras un deploy nuevo; (b) primera visita tras un rato sin uso con el monitor activo.
