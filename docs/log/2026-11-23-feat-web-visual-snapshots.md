# feat(web): compare key pages against reference screenshots

Issue: #52 · PR: #104 · Autor: Rubén

## Decisiones

- **D-nueva · Capturas de referencia con Playwright, generadas siempre en Linux con la imagen oficial** (precisa D107 y D136). Es la segunda parte de la #52 y lo que el plan de diseño (§7) llama "capturas automáticas en CI". **Qué compara:** la página pública, `/admin/login` y el muestrario `/admin/ui`, a 1280 y 390 px, en claro y oscuro; el muestrario solo en claro, porque ya pinta los dos modos. Son 10 imágenes. **Cómo:** contra `next dev`, porque el muestrario solo existe en desarrollo, con una API sintética que sirve una agencia ficticia en `alpha.localhost`. Chromium resuelve `*.localhost` al loopback, así que el host llega real sin tocar el archivo de hosts. **Por qué en Linux:** las fuentes se ven distintas en Windows, macOS y Linux. Las referencias salen de `mcr.microsoft.com/playwright:v1.65.0-noble`, en local con Docker (`test:visual:docker` y `test:visual:update`) y en la CI. **En la CI:** el job `visual` corre cuando cambia algo que puede alterar las páginas y sube el reporte con las diferencias. No es un check requerido: lo será con la B2, cuando haya pantallas de galería que proteger.

## Historial

- 2026-11-23: **#52, segunda parte → PR #104: capturas automáticas.** `@playwright/test` 1.65.0, publicado el 2026-11-05 (D131); la 1.65.1 todavía no cumple 14 días. El lockfile solo agrega `@playwright/test`, `playwright` y `playwright-core`. La imagen trae Node 26, y el script instala el de `.nvmrc` verificando el SHA-256 oficial. Probado en Docker Desktop en Windows: las 10 capturas coinciden con sus referencias en tres corridas seguidas, en unos 7 s más la instalación.

## Tiempo

- #52, segunda parte (R): sin estimado; real ≈ 1.5 h.

## Pendientes

- **Volverlo check requerido con la B2** (galería, hito 1), y sumar las pantallas de la galería y del panel con sesión.
- **Subir Playwright y la imagen juntos:** la versión del paquete y la etiqueta de la imagen deben coincidir, en `docker.mjs` y en `ci.yml`.
