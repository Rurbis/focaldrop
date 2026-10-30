# feat(api): resolve tenants by forwarded host

Issue: #13 (parte API de F1) · PR: #61 · Autor: Fabian

## Decisiones

- **D-nueva · El respaldo del tenant depende del entorno de despliegue, separado del modo de Node** (precisa D7, D40 y D57) — `APP_ENV` admite `development`, `test`, `staging` y `production`; si se omite, toma `NODE_ENV`. Staging puede ejecutar la imagen de producción (`NODE_ENV=production`) y resolver hosts desconocidos o de previews con `DEFAULT_AGENCY_SLUG`. Producción nunca usa respaldo y se niega a arrancar si trae un slug por defecto no vacío. La validación vive en `config/env.ts`; `SENTRY_ENVIRONMENT` solo etiqueta telemetría. El workflow fija `APP_ENV=staging` y recibe el slug desde el secreto `DEFAULT_AGENCY_SLUG` del Environment, para no publicar datos de la agencia en los logs. La agencia de staging se aprovisiona en #71; este cambio no ejecuta el seed local allí.

## Historial

- 2026-10-22: **#13, parte API → PR #61:** resolución por `X-Tenant-Host` normalizado, contrato público Zod, `GET /public/tenant`, caché por host de cinco minutos (máximo 1,000 entradas) y contexto aislado con `nestjs-cls` 7.0.1. Cabeceras inválidas → 400; agencia ausente/suspendida → 404; fallos de BD conservan 500. Middleware en raíces y rutas anidadas de `/public` y `/admin`; `/health` no consulta la BD. Pool con cierre al apagar Nest, sin migraciones nuevas. Pruebas de normalización, caché, proyección pública, concurrencia y consultas/HTTP con el rol `app_api`.
- 2026-10-26: **Revisión de Rubén atendida:** el respaldo distingue staging de producción mediante `APP_ENV`, con pruebas usando el modo productivo de Node y hosts de staging/previews. Producción rechaza un slug por defecto al arrancar. Se documenta que dominios/suspensiones pueden tardar hasta cinco minutos por instancia en reflejarse, que Next debe sobrescribir el header del navegador y que la autorización futura exige membresía del usuario. Se incorpora `main`, conservando los parches de Node, dependencias y parsers; la prueba de parsers sustituye la conexión de BD como las demás e2e. Las entradas de este PR pasan a esta nota, según D138, sin volver a editar la bitácora compartida.

## Tiempo

- #13, parte API: estimado 4 h; implementación inicial ≈ 0.25 h asistidas hasta el primer PR. Revisión y correcciones pendientes de registrar al cierre de F1.

## Pendientes

- F1 sigue abierta por la parte web (#13): `getAgencyByHost`, caché etiquetada y reenvío desde Next sobrescribiendo `X-Tenant-Host`.
- #71: aprovisionar la agencia y su owner en staging; después configurar su slug en el Environment `staging`.
- #14: validar membresía y rol del usuario del JWT, independientemente del host o del respaldo.
- Al implementar cambios de dominio/suspensión, decidir invalidación inmediata de las cachés por instancia o aceptar explícitamente su retraso de hasta cinco minutos.
