# Supabase local

Entorno de desarrollo de Focal Drop para la issue #8 (D60, D90, D94, D101, D116 y D121). Cada desarrollador
tiene su propia base de datos y sus propias credenciales locales. El proyecto de staging corresponde
a la #30; estos pasos no requieren iniciar sesión, enlazar un proyecto ni acceder a staging.

## Requisitos

- Node 24 compatible con `engines` y `.nvmrc`, y pnpm **10.34.6**.
- Docker Desktop iniciado, con el motor de contenedores **Linux** funcionando.
- Internet para la instalación de dependencias y la primera descarga de imágenes de Docker.
  Las ejecuciones siguientes reutilizan las imágenes y los volúmenes locales.

En Windows se puede usar PowerShell 5.1 o 7. WSL2 con Docker Desktop también es válido.
Comprueba el entorno desde la raíz del repositorio:

```sh
node --version
pnpm --version
docker info --format '{{.OSType}}'
```

El último comando debe devolver `linux`. Si Docker no responde, abre Docker Desktop y espera a que
el motor termine de iniciar.

## Instalar y arrancar

Desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm exec supabase --version
pnpm db:start
```

La CLI está fijada como dependencia de desarrollo en el `package.json` raíz y en `pnpm-lock.yaml`.
No hace falta instalar otra copia global ni ejecutar `supabase init`: la configuración ya está
versionada en esta carpeta. La primera ejecución tarda más por la descarga de imágenes.

| Servicio                     | Dirección local          |
| ---------------------------- | ------------------------ |
| API de Supabase y Auth       | `http://127.0.0.1:54321` |
| Postgres 17                  | `127.0.0.1:54322`        |
| Studio (tablas y editor SQL) | <http://127.0.0.1:54323> |
| Mailpit (visor de correos)   | <http://127.0.0.1:54324> |
| SMTP de Mailpit              | `127.0.0.1:54325`        |

Los puertos deben estar libres. Si otro proyecto local de Supabase los está usando, detén ese
proyecto antes de arrancar este. El identificador de los contenedores y volúmenes es `focaldrop-local`.

## Credenciales en `infra/supabase/.env.local`

Después del arranque, exporta las variables de la CLI a **`infra/supabase/.env.local`**.
La salida contiene credenciales: guárdala en ese archivo, que Git ignora, y conserva únicamente
valores de ejemplo en `infra/supabase/.env.example`. Ejecuta los comandos desde la raíz del repositorio.

En **PowerShell 5.1 o 7**:

```powershell
$localEnvPath = Join-Path (Get-Location) 'infra/supabase/.env.local'
if (Test-Path -LiteralPath $localEnvPath) {
    throw 'infra/supabase/.env.local ya existe; conserva su contenido y actualiza solo las variables necesarias.'
}

$localEnv = pnpm exec supabase status --workdir infra --output env
if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo consultar Supabase. Comprueba pnpm db:start antes de crear .env.local.'
}
[System.IO.File]::WriteAllLines($localEnvPath, [string[]]$localEnv)
Remove-Variable localEnv
```

`WriteAllLines` escribe UTF-8 sin BOM tanto en PowerShell 5.1 como en 7. En 5.1, `>` escribe
UTF-16 y `Set-Content -Encoding utf8` añade un BOM que impide que Node reconozca la primera variable.

En **Bash** (Linux, macOS o WSL):

```sh
local_env="$(pnpm exec supabase status --workdir infra --output env)" &&
  (set -C; printf '%s\n' "$local_env" > infra/supabase/.env.local)
unset local_env
```

`set -C` impide sobrescribir un archivo existente. Si ya tienes `infra/supabase/.env.local`, combina
las variables necesarias conservando las demás. Si guardaste antes las credenciales de Supabase en
`.env.local` de la raíz, conserva ese archivo y traslada solo las variables de la CLI a esta carpeta.

Estas variables describen la pila local, no la configuración de una app: `API_URL` apunta al gateway
de Supabase, no a Nest. Cada app tendrá su propio archivo de entorno con sus respectivas issues.
Las llaves heredadas de la CLI (`ANON_KEY`, `SERVICE_ROLE_KEY` y `JWT_SECRET`) son solo locales;
no se deben copiar a staging, que usa su propia configuración (D121). Sus credenciales siguen en Bitwarden.

## Configuración del proyecto

- `db.major_version = 17`: misma versión mayor que CI y staging.
- `auth.enable_signup = false`: registro público deshabilitado (D94).
- `auth.email.enable_signup = true`: habilita el proveedor de correo para que los usuarios
  aprovisionados puedan iniciar sesión con contraseña. El registro público sigue cerrado por
  `auth.enable_signup = false`; `auth.sms.enable_signup = false` mantiene apagado el proveedor SMS.
- `auth.enable_anonymous_sign_ins = false`: sin acceso anónimo de Auth.
- `auth.email.enable_confirmations = false`: sin confirmaciones de correo en local.
- `api.enabled = false`: Data API deshabilitada, igual que en staging (D121). `/rest/v1/`
  devuelve 503; Auth y Studio siguen funcionando. Solo Nest accederá a los datos de negocio.
- `api.auto_expose_new_tables = false`: las tablas nuevas tampoco reciben permisos automáticos.
  Los permisos y RLS de capa 0 se implementan en la #11 (D60).
- Las migraciones de aplicación viven en `apps/api/drizzle/` (#11). La ejecución
  de migraciones y seeds de Supabase está deshabilitada; el seed de la agencia demo lo ejecuta la API (#15).
- Storage, Realtime, Edge Functions y Analytics están deshabilitados: esta configuración cubre
  Postgres, Auth, Studio y Mailpit. Los archivos irán a R2 y el Worker de ZIP a Cloudflare.

Los cambios en `config.toml` requieren detener y volver a iniciar la pila local.

## Detener y volver a iniciar

```sh
pnpm db:stop
pnpm db:start
```

`db:stop` conserva los datos para el siguiente arranque. Las migraciones y el seed
se gestionan con Drizzle y los scripts de la API. Después de
copiar `apps/api/.env.example` a `apps/api/.env` (solo si no existe; si ya existe,
añade las variables de BD nuevas sin sobrescribir las demás), ejecuta desde
la raíz `pnpm db:migrate` y `pnpm db:seed`. La agencia `demo`, `localhost` y el owner
local quedan listos; las credenciales sintéticas están en la
[guía de la API](../../apps/api/README.md#local-demo-issue-15).

`pnpm db:reset` borra todos los datos de esta pila local, incluidos los usuarios
de Auth, y vuelve a migrar y sembrar. Solo acepta la configuración local y usa
`supabase db reset --local`; no apunta al proyecto de staging. No añadas `--no-backup`
al comando habitual de parada, porque descarta los datos locales.

## Comprobación en las dos máquinas

Fabian y Rubén deben completar esta lista en sus propios equipos antes de cerrar la #8:

- [ ] Instalar con `pnpm install --frozen-lockfile` y comprobar la versión de la CLI.
- [ ] Ejecutar `pnpm db:start` sin errores de salud de los contenedores.
- [ ] Abrir Studio y Mailpit en las direcciones de la tabla.
- [ ] Guardar las credenciales propias en `infra/supabase/.env.local` y confirmar que
      `git check-ignore infra/supabase/.env.local` reconoce la ruta y `git status` no la muestra.
- [ ] Comprobar que `http://127.0.0.1:54321/rest/v1/` responde 503 con Data API deshabilitada.
- [ ] Comprobar en `http://127.0.0.1:54321/auth/v1/settings`, con la llave pública local en
      el header `apikey`, que `disable_signup` es `true`, `external.email` es `true` y
      `external.anonymous_users` es `false`.
- [ ] Comprobar Postgres y la disponibilidad de `pg_cron` y `pg_net` en el editor SQL de Studio:

  ```sql
  select current_setting('server_version') as server_version;
  select name, default_version
  from pg_available_extensions
  where name in ('pg_cron', 'pg_net');
  ```

- [ ] Crear un dato sintético de comprobación en Studio:

  ```sql
  create schema focaldrop_local_check;
  create table focaldrop_local_check.persistence_probe (id integer primary key);
  insert into focaldrop_local_check.persistence_probe values (1);
  ```

- [ ] Ejecutar `pnpm db:stop` y después `pnpm db:start`. En Studio, comprobar y retirar la prueba:

  ```sql
  select id from focaldrop_local_check.persistence_probe;
  -- Debe devolver 1.
  drop table focaldrop_local_check.persistence_probe;
  drop schema focaldrop_local_check;
  ```

Para comprobar el login antes del seed, crea un usuario sintético con la API de administración de
Supabase local (`POST /auth/v1/admin/users`, con `email_confirm: true`), usando la llave de servicio
local en `apikey` y `Authorization: Bearer`. Inicia sesión con ese correo y contraseña en
`POST /auth/v1/token?grant_type=password`, con la llave pública local en `apikey`: debe responder 200. `POST /auth/v1/signup` debe seguir rechazando el registro con `signup_disabled`, y el acceso
anónimo debe fallar con `anonymous_provider_disabled`. Retira el usuario de prueba con
`DELETE /auth/v1/admin/users/{id}` al terminar; no publiques llaves, contraseñas ni tokens.

Esta comprobación solo usa datos sintéticos y no crea tablas de negocio. El owner de la agencia demo
y su aprovisionamiento pertenecen al seed de la #15.

## Referencias

- [Issue #8](https://github.com/Rurbis/focaldrop/issues/8).
- [Instalación y ejecución de Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
- [Referencia de `config.toml`](https://supabase.com/docs/guides/local-development/cli/config).
