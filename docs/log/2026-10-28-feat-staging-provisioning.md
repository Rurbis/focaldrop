# feat(api): provision the staging agency and its owner from a manual workflow

Issue: #71 · PR: (este) · Autor: Rubén

## Decisiones

- **D-nueva · Alta de agencias en staging y producción con `pnpm db:provision`, sin contraseñas y con los datos de la agencia como secretos** (precisa D7, D121 y D128).
  - **Qué hace:** crea o reutiliza una agencia, su dominio principal, la cuenta Auth de su owner, su perfil y su membresía `owner`. Comparte `provisionAgency()` con el seed local de la #15, que ahora es un caso particular. Correrlo otra vez no cambia nada, y nunca toma un *slug* ni un dominio de otra agencia.
  - **Sin contraseñas:** el owner nuevo se crea confirmado y sin contraseña, y la define con "¿Olvidaste tu contraseña?". Así ninguna contraseña pasa por scripts, CI ni logs, y de paso se prueba la recuperación de punta a punta. Si la cuenta ya existe, se reutiliza sin tocarla.
  - **Dónde corre en staging:** en el workflow manual `provision-staging.yml`. El repo y sus logs de Actions son públicos, así que el *slug*, el nombre y el correo del owner vienen de secretos del Environment `staging`, que GitHub oculta en los logs. Nada va en los *inputs* del workflow. El *slug* es el mismo que la API usa como respaldo en staging (`DEFAULT_AGENCY_SLUG`, #61).
  - **Guardas:** `PROVISION_TARGET` debe ser `staging` o `production`, y producción exige además `--confirm-production`. No lee archivos `.env`, y sus errores nombran las variables, nunca sus valores. En staging el dominio es de la plataforma (`platform_subdomain`); en producción será el de la agencia (`custom`).

## Historial

- 2026-10-28: **#71 → PR: alta de la agencia de staging.** `provisionAgency()` sale del seed de la #15, y el cliente de Auth administrativo queda compartido (`auth-admin.ts`). Pruebas: guardas y validación (sin valores en los errores), alta del owner sin contraseña y reutilización de una cuenta existente, y en integración, una segunda agencia junto a la demo y el rechazo de un *slug* ajeno.

## Tiempo

- #71 Alta de la agencia en staging (R): estimado 3 h; real ≈ 1.5 h hasta el PR.

## Pendientes

- Rubén crea en el Environment `staging` los secretos `SUPABASE_SECRET_KEY`, `DEFAULT_AGENCY_SLUG`, `STAGING_AGENCY_NAME` y `STAGING_OWNER_EMAIL`, y al mezclar corre el workflow.
- El owner define su contraseña con "¿Olvidaste tu contraseña?". Antes hay que cargar en Supabase staging la plantilla de recuperación (`infra/supabase/templates/recovery.html`).
