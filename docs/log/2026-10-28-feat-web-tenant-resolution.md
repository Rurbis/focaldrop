# Resolución de agencia y reenvío desde Next — F1

Issue: #13 · PR: #78 · Autor: Fabian

## Decisiones

- **D-nueva · Separar F1 de la caché persistente** — A partir de la revisión de Rubén, F1 entrega `getAgencyByHost`, `/api/public/tenant` y el puente `/api/admin/*`, sin recursos nuevos de Cloudflare. La caché etiquetada `agency-domains` pasa a F6/S-4 (#21), donde se compararán R2/D1 y KV y se registrará la decisión en ADR-0010. Nest conserva sus cinco minutos de caché en memoria; la web pide datos con `no-store`.
- El puente verifica el token de la sesión antes de enviarlo a Nest, sobrescribe credenciales y host aportados por el navegador, limita cuerpos JSON a 100 KiB y exige `Origin` del mismo sitio en mutaciones. Membresías y roles siguen en F3/F5.
- Se elimina `POST /api/cache/agency-domains` y su secreto: todavía no existe una operación que cambie dominios. La invalidación se añadirá con esa operación.
- Se eliminan el script de despliegue, los IDs ficticios de D1 y el entorno `cache-preview`. Se conservan los comandos de OpenNext y los comentarios de Wrangler que explican D137. Si F6 elige D1, sus IDs reales irán directamente en `wrangler.jsonc`.

## Historial

- 2026-10-28: parte web de F1 sobre el PR #61: resolución y validación pública de agencia y reenvío con sesión verificada, con pruebas de fronteras HTTP.
- 2026-10-29: revisión del #78: la caché persistente se separa de F1. El verificador usa Next compilado y una API sintética para comprobar lecturas nuevas por petición, separación de hosts, exclusión de campos privados y recuperación tras errores. El smoke de staging exige una agencia real aprovisionada por #79; no acepta un 404 como éxito.
- El #61 quedó integrado en `main` y sus despliegues de API y web terminaron correctamente. La propuesta separada de caché está en el borrador #82, asociado a F6/S-4.

## Tiempo

Estimación original de la parte web: 3 h. Implementación inicial y validación asistidas: aproximadamente 0.75 h; revisión y separación posteriores registradas en el PR.

## Pendientes

- Revisión del núcleo web del #78 sobre `main`.
- Aprovisionar agencia/dominio de staging con #79 (#71), y comprobar `/api/public/tenant` en la preview publicada.
- F6 (#21): caché persistente, etiqueta `agency-domains`, medición de CPU/tamaño y ADR-0010. Next 16 recomienda `use cache`; su compatibilidad y la invalidación deben verificarse en el Worker, además de en Next local. La implementación anterior se conserva en el historial del #78 (`30c6c99`) como referencia, no como decisión de infraestructura aprobada.
- F3 (#12) empieza después de integrar F1. La recuperación de contraseñas en staging sigue dependiendo del SMTP documentado en #79.
