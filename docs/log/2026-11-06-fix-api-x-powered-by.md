# fix(api): stop naming the framework in responses

PR: #86 · Autor: Rubén

## Historial

- 2026-11-06: **La API deja de enviar `x-powered-by: Express` → PR #86:** se veía desde que quedó pública en staging (#69). Ahora coincide con el front, que ya lo tenía apagado (`poweredByHeader: false`). No corrige una vulnerabilidad; solo evita anunciar el framework. Prueba e2e en respuestas correctas y de error, que fallaba antes del cambio.

## Tiempo

- `x-powered-by` en la API (R): sin estimado; real ≈ 0.1 h.
