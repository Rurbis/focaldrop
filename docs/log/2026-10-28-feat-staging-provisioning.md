# feat(api): provision the staging agency and its owner from a manual workflow

Issue: #71 · PR: #79 · Autor: Rubén

## Decisiones

- **D-nueva · Alta de agencias en staging y producción con `pnpm db:provision`, sin contraseñas y con los datos de la agencia como secretos** (precisa D7, D121 y D128).
  - **Qué hace:** crea o reutiliza una agencia, su dominio principal, la cuenta Auth de su owner, su perfil y su membresía `owner`. Comparte `provisionAgency()` con el seed local de la #15, que ahora es un caso particular. Correrlo otra vez no cambia nada, y nunca toma un *slug* ni un dominio de otra agencia.
  - **Sin contraseñas:** el owner nuevo se crea confirmado y sin contraseña, y la define con "¿Olvidaste tu contraseña?". Así ninguna contraseña pasa por scripts, CI ni logs, y de paso se prueba la recuperación de punta a punta. Si la cuenta ya existe, se reutiliza sin tocarla.
  - **Dónde corre en staging:** en el workflow manual `provision-staging.yml`. El repo y sus logs de Actions son públicos, así que el *slug*, el nombre y el correo del owner vienen de secretos del Environment `staging`, que GitHub oculta en los logs. Nada va en los *inputs* del workflow. El *slug* es el mismo que la API usa como respaldo en staging (`DEFAULT_AGENCY_SLUG`, #61).
  - **Guardas:** `PROVISION_TARGET` debe ser `staging` o `production`, y producción exige además `--confirm-production`. No lee archivos `.env`, y sus errores nombran las variables, nunca sus valores. En staging el dominio es de la plataforma (`platform_subdomain`); en producción será el de la agencia (`custom`).

## Historial

- 2026-10-28: **#71 → PR: alta de la agencia de staging.** `provisionAgency()` sale del seed de la #15, y el cliente de Auth administrativo queda compartido (`auth-admin.ts`). Pruebas: guardas y validación (sin valores en los errores), alta del owner sin contraseña y reutilización de una cuenta existente, y en integración, una segunda agencia junto a la demo y el rechazo de un *slug* ajeno.

- 2026-10-29: **Revisión de Fabian al PR #79:** el CLI imprimía `error.message`, y los errores de Drizzle traen el SQL con sus parámetros: nombre, *slug* y correo. Como el CLI los normaliza (recorta el nombre y pasa el correo a minúsculas), GitHub ya no los reconocía como secretos y quedaban visibles en los logs públicos. Ahora solo se imprimen los mensajes de `SafeError` (configuración inválida, colisiones y fallas de Auth con su código HTTP), y cualquier otro error sale con un texto fijo, sin parámetros, URLs ni `cause`. Una prueba de integración fuerza el rechazo del `INSERT` con un *trigger*, corre el CLI real y comprueba que la salida no tiene ningún valor, ni original ni normalizado.

## Tiempo

- #71 Alta de la agencia en staging (R): estimado 3 h; real ≈ 1.5 h hasta el PR.

## Pendientes

- Rubén crea en el Environment `staging` los secretos `SUPABASE_SECRET_KEY`, `DEFAULT_AGENCY_SLUG`, `STAGING_AGENCY_NAME` y `STAGING_OWNER_EMAIL`, y al mezclar corre el workflow.
- **Supabase solo deja editar la plantilla de recuperación con SMTP propio** (lo comprobó Rubén el 2026-10-28), y su correo por defecto no funciona con `/admin/auth/confirm` (D133). Mientras staging no tenga SMTP, el owner se crea antes en el dashboard de Supabase, con contraseña de Bitwarden, y el workflow lo reutiliza.
- **SMTP propio con Resend** (D: Resend + React Email; dominio de la plataforma en Cloudflare): hace falta para la recuperación de contraseña en staging y, sobre todo, antes de producción (hito 3).
