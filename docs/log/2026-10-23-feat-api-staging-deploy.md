# ci(api): deploy the api to cloud run staging

Issue: #16 · PR: (este) · Autor: Rubén

## Decisiones

- **D-nueva · La API llega a Cloud Run como imagen propia, con secretos en Secret Manager y un servicio público creado a mano** (precisa D63, D87, D105, D106 y D125) — F2 (#16).
  - **Imagen:** `apps/api/Dockerfile` en dos etapas. La primera instala solo la API y `shared`, compila los dos y copia la API con sus dependencias de producción usando `pnpm deploy --prod --legacy`. El modo *legacy* evita activar `injectWorkspacePackages` en todo el repo, y `"files": ["dist"]` conserva el código compilado. La final es Node 24 slim, corre como `node` y no trae compilador, pruebas ni herramientas de la raíz. Pesa unos 98 MB comprimida; las capas de Node se comparten entre versiones, así que las 5 que guarda la limpieza caben en el nivel gratuito de Artifact Registry. **Node 24.22.1** fijado por *digest*: es versión de seguridad (2026-10-20), así que no espera los 14 días de D131. Dependabot actualiza la imagen.
  - **Orden del workflow:** primero compila la imagen, y solo después sube, migra y despliega, para no tocar la BD si el build falla. La migración sigue antes del deploy (D106). La imagen se compila antes de autenticarse con Google, porque la acción de autenticación escribe un archivo de credenciales en el *workspace*.
  - **Secretos:** `DATABASE_URL` vive en Secret Manager (`api-database-url-staging`) y solo la cuenta de la API la lee. Como variable de entorno se vería en la configuración del servicio. Cambia lo que decía D105 ("si crecen, se migra a Secret Manager"): se migra desde el primer secreto.
  - **Servicio público:** el deployer tiene `run.developer`, que no puede quitar la verificación de invocador (requiere `run.services.setIamPolicy`, que viene en `run.admin`), y la organización rechaza `allUsers` (D125). Por eso el servicio se crea una vez a mano, público y con la imagen de ejemplo de Google; cada deploy cambia la imagen y conserva el ajuste. El deployer se queda con el mínimo de permisos.
  - **Rol `app_api` en staging:** la migración `0001` lo crea sin contraseña. Se crea antes, a mano, con contraseña de Bitwarden; la migración acepta un rol existente sin privilegios administrativos.

## Historial

- 2026-10-23: **F2 → PR: la API en staging (#16).** Dockerfile probado en local: `/health` responde 200 desde el contenedor, que corre como `node` y sin dependencias de desarrollo. `deploy-api.yml` compila, sube, migra, despliega y prueba `/health`. `bootstrap.sh` agrega Secret Manager, y `infra/gcp/README.md` explica los tres pasos únicos antes del primer deploy.

## Tiempo

- #16 La API en staging (R): estimado 4 h; real ≈ 1.5 h hasta el PR, con la revisión de la documentación de Cloud Run, Secret Manager y la verificación de invocador. Falta el primer deploy.

## Pendientes

- **Antes de mezclar (Rubén, una vez):** correr `bootstrap.sh` de nuevo (también redespliega el *billing guard* con el `uuid` del #41), crear `app_api` en Supabase, cargar el valor del secreto y crear el servicio público (`infra/gcp/README.md`).
- **Opcional:** la variable `API_SENTRY_DSN` en el Environment `staging` para que los errores de la API lleguen a Sentry.
- **UptimeRobot:** monitores para el front y la API de staging (D123 los dejaba para cuando existiera staging).
- **Para F1 (#13):** cuando el fallback de staging use una variable de entorno, agregarla a `--set-env-vars` en `deploy-api.yml`.
- **Para la demo (#27):** staging no tiene agencias ni owner, y el seed se niega a correr fuera de local. Hace falta una forma de dar de alta la agencia y su owner en staging.
