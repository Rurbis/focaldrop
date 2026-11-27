# chore(deps): enforce the two-week release age in pnpm and in ci

PR: #105 · Autor: Rubén

## Decisiones

- **D-nueva · Los 14 días de D131 se aplican solos: pnpm al elegir versiones y la CI al revisar el lockfile. Los arreglos de seguridad entran por versión exacta** (precisa D131).
  - **pnpm:** `minimumReleaseAge: 20160` (14 días en minutos) en `pnpm-workspace.yaml`. pnpm solo elige versiones con esa edad, también las transitivas, al agregar o actualizar dependencias y al regenerar el lockfile. Existe desde pnpm 10.16.0, y la exclusión por versión exacta desde la 10.19.0 ([documentación de pnpm 10](https://pnpm.io/10.x/settings#minimumreleaseage)).
  - **La CI:** pnpm no revisa las versiones que el lockfile ya tiene. `pnpm install --frozen-lockfile`, lo que corre la CI, instaló sin quejarse una versión de 7 días que ya venía en él. Por eso el job `quality` corre `scripts/check-release-age.mjs` en cada PR:
    - compara el lockfile con el de la rama base y pide al registro de npm la fecha de cada versión nueva;
    - falla si alguna tiene menos de 14 días, y dice desde qué fecha se permite;
    - falla también con versiones que no vienen del registro (git o una URL), porque su edad no se puede comprobar.

    Reemplaza la revisión a mano de las fechas en los PRs de dependencias (los 168 paquetes del #93).
  - **Arreglos de seguridad:** no esperan (D131). La versión exacta se exenta en `minimumReleaseAgeExclude`, con el aviso y la fecha en que cumple 14 días, en el mismo PR que la sube. Dependabot no puede editar ese archivo, así que ese PR se hace a mano, como ya pasaba con el #58 y el #97.
    - La revisión de la CI rechaza exentar un paquete entero, un patrón o un rango: sus versiones futuras tampoco esperarían.
    - Cuando una excepción ya cumplió los 14 días, la revisión pide borrarla.
  - **Por qué `node:test`:** el script no es de ningún paquete del workspace, así que no tiene Vitest a mano. No usa dependencias y lee la configuración con el mismo pnpm (`pnpm config get`).

## Historial

- 2026-11-23: **D131 automático → PR #105.** Se probó con pnpm 10.34.6 en carpetas aparte, con versiones reales de `minimatch`:
  - `minimatch@^11` se resolvió a la 11.0.5 (18 días) y no a la 11.0.9 (7 días). `glob@14.0.3` trajo también la 11.0.5: las transitivas se filtran.
  - Pedir la 11.0.9 exacta falla con `ERR_PNPM_NO_MATURE_MATCHING_VERSION`; pnpm no cae a otra versión.
  - Exentar `minimatch@11.0.9` la deja pasar; exentar otra versión del mismo paquete no.
  - Con un lockfile que ya traía la 11.0.9, `install` e `install --frozen-lockfile` la aceptan.

  **En el repo:** la instalación congelada pasa y el lockfile no cambia. Una actualización completa de las transitivas bajo la regla (`pnpm update --lockfile-only`, descartada después) cambió 50 versiones, todas con 14 días o más; por ejemplo, eligió `rolldown` 1.2.18 y no la 1.2.19, que en el #97 tenía días.

  **La revisión de la CI:** 18 pruebas. Cada una de 13 mutaciones de sus reglas hace fallar al menos una: apagar la regla de edad, cambiar `<` por `<=`, exentar por nombre, aceptar patrones o rangos, revisar todo el lockfile en lugar de lo nuevo, entre otras. Contra el registro real, frente al commit anterior al #97, revisó 10 versiones nuevas en 2 s. Con una versión de 7 días metida en el lockfile, falla y dice desde qué fecha se permite.

- 2026-11-26: **Revisión de Fabian al PR #105 (P2):** CodeQL marcó `name.replace('/', '%2f')` porque solo reemplaza la primera diagonal. Pasa a `replaceAll`; los nombres de npm solo llevan una, así que la URL no cambia y las pruebas tampoco.

## Tiempo

- D131 automático (R): sin estimado; real ≈ 2 h asistidas (documentación, pruebas de pnpm, script y pruebas de mutación).

## Pendientes

- **Supuesto:** Dependabot resuelve con el pnpm de `packageManager` (10.34.6) y respeta la regla. Lo comprueba el #102 al rehacerse (`@dependabot rebase`) después de este PR: si alguna versión nueva no cumple, la revisión de la CI lo marca.
- **Fuera del workspace:** el _billing guard_ (`infra/gcp/billing-guard`) usa npm y solo tiene el _cooldown_ de Dependabot.
