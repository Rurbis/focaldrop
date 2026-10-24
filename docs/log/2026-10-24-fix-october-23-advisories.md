# fix(deps): patch body-parser, multer, fast-uri and undici for the october 23 advisories

Issue: — · PR: (este) · Autor: Rubén

## Historial

- 2026-10-24: **14 alertas de Dependabot del 2026-10-23 (#21–#34) → PR.** Todas entran por la excepción de seguridad de D131.
  - **De ejecución de la API**, las que importan, porque con el #69 la API queda pública:
    - `body-parser` 2.3.0 → 2.4.0 ([GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), alta: denegación de servicio con bytes de más después de un cuerpo comprimido). Llega con Express 5, que acepta la 2.4.0 en su rango, así que basta con el lockfile.
    - `multer` 2.4.0 → 2.5.0 ([GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m), alta: denegación de servicio). `@nestjs/platform-express` lo fija exacto, incluso en la 12.2.0, la última, así que va un `overrides` en `pnpm-workspace.yaml` hasta que Nest fije la 2.5.0. La API todavía no procesa `multipart`.
  - **De desarrollo:** `fast-uri` 3.1.8 → 3.1.9 (cuatro avisos, vía `ajv` de la CLI de Nest; basta con el lockfile) y `undici` 7.29.1 → 7.30.1 (tres avisos, vía `miniflare`, el runtime local de wrangler, que lo fija exacto; `overrides` como el de `sharp`). Ninguno llega a la imagen de la API ni al Worker.
  - **Billing guard (npm):** `body-parser` y `fast-uri` en su `package-lock.json`. Riesgo mínimo, porque solo lo invoca Pub/Sub con su propia cuenta. Llega a la función la próxima vez que corra `bootstrap.sh`. El #70 de Dependabot, que solo subía `fast-uri`, queda de más.
  - El lockfile cambia solo esos cuatro paquetes: un `pnpm update` también subía `rolldown` y otros sin relación, así que se fijaron con `overrides` temporales que luego se quitaron.

## Tiempo

≈ 0.6 h.

## Pendientes

- Quitar los `overrides` de `multer` y `undici` cuando Nest y wrangler fijen las versiones parchadas.
- Redesplegar el *billing guard* (`bootstrap.sh`) en la próxima ocasión.
