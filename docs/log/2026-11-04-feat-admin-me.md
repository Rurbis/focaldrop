# feat(api): verify supabase sessions and serve the signed-in member

Issue: #12 · PR: — · Autor: Rubén

## Decisiones

- **D-nueva · Cómo verifica Nest la sesión: solo ES256, con emisor, y 401, 403 y 500 significan cosas distintas** (precisa D57, D62 y D121).
  - **Qué exige a un token:** algoritmo ES256 (D121), firma de una llave publicada, `exp` obligatorio y vigente, audiencia `authenticated`, `sub` con formato UUID y emisor. La #12 solo pedía firma, vencimiento y audiencia. El emisor se suma porque es gratis: sale de `SUPABASE_JWKS_URL`, sin otra variable.
  - **Biblioteca:** `jose` 6.2.12, la versión que el lockfile ya traía por la CLI de Supabase; respeta los 14 días de D131. Guarda las llaves 10 minutos, y un `kid` desconocido las vuelve a pedir como máximo cada 30 segundos: rotar no pide reiniciar, y los tokens basura no se convierten en peticiones a Supabase.
  - **401:** falta el token o no es válido, sin decir por qué. El panel manda al login.
  - **403:** la sesión es válida, pero el usuario no es miembro de la agencia del host. Volver a entrar no ayudaría, así que no es 401. Tampoco es 404: la agencia de un host ya es pública y el panel debe distinguir esto de un host desconocido. El 404 de la Parte A §3.3 sigue siendo para recursos de otra agencia (F5).
  - **500:** no se pudieron leer las llaves. Si fuera 401, una caída de Supabase sacaría a todos al login. Es 500 y no 503 porque el filtro de Sentry ignora toda `HttpException`, también las 5xx, y esta falla sí debe reportarse.
  - **Configuración:** sin `SUPABASE_JWKS_URL`, staging y producción no arrancan. En desarrollo y pruebas se usa la CLI local, así que los `.env` que ya existen siguen funcionando. `SUPABASE_JWT_AUDIENCE` es opcional.

## Historial

- 2026-11-04: **F3, parte API → PR: `AuthGuard` y `GET /admin/me` (#12).** Devuelve perfil, agencia del host y rol, sin caché y con el contrato `AdminMeSchema` en `shared`; `isPlatformAdmin` y el correo de la agencia no salen de la API. Pruebas: 24 e2e con llaves de prueba y un JWKS servido por HTTP local (firma falsa, otro algoritmo, HMAC con la llave pública, sin firma, sin `exp`, rotación, caché y JWKS caído), y una de integración con `app_api`. Se comprobó que quitar cada regla de seguridad rompe una prueba. Con un token real de Supabase Auth local (ES256, y emisor y audiencia coinciden): 200, firma alterada 401, sin membresía 403. El JWKS de staging publica ES256. El smoke del deploy manda un token falso con un `kid` desconocido para comprobar que la API puede leer el JWKS.

## Tiempo

- #12 F3, parte API (R): estimado 4 h; real ≈ 2 h hasta el PR.

## Pendientes

- **F3, parte web:** `/admin` con el nombre del owner y de la agencia, estados de carga y error, y un 401 que lleve al login. Necesita el puente del #78; la #12 sigue abierta hasta entonces.
- **Probar con un token real en staging:** llega con la parte web, cuando el owner entre al panel.
- **Producción:** cuando exista su Environment, debe llevar `SUPABASE_JWKS_URL`.
- **F5 (#14):** `AuthModule` todavía no exporta `AuthGuard`; se agrega cuando otro módulo lo necesite. `TenantGuard` puede sacar la comprobación de membresía de `AuthService`.
