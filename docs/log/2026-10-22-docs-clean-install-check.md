# docs: clarify the local install guide after a clean-clone run

Issue: #23 · PR: #60 · Autor: Rubén

Nota convertida de las filas que este PR agregaba a la bitácora (D138).

## Historial

- 2026-10-22: **#23 cerrada → PR:** instalación local desde un clon limpio en 2.7 min (con caché de pnpm y Docker; sin ella, estimado en 10–15 min), por debajo de los 30 del criterio. La guía gana tres aclaraciones: el aviso de pnpm sobre los scripts de `esbuild` es normal, el comando para copiar `apps/api/.env` en Bash y en PowerShell, y que `Stopped services` y el aviso de `INBUCKET_URL` al generar `.env.local` no son errores. Los 92 enlaces internos funcionan.

## Tiempo

- #23 Docs y README (R): estimado 3 h, real ≈ 0.5 h de la prueba final; el PR #36 no registró su tiempo. **Instalación desde un clon limpio (2026-10-22): 2.7 min** de `git clone` a `/admin` y `/health` en 200, en Windows 10 con PowerShell 5.1, siguiendo el README al pie de la letra y con el volumen de Supabase borrado antes. pnpm y Docker ya tenían caché; sin ella se suman unos 498 paquetes y 4.06 GB de imágenes, estimado en 10–15 min en total. No la hizo una persona nueva. 92 enlaces internos de `docs/` y los README, sin rotos.
