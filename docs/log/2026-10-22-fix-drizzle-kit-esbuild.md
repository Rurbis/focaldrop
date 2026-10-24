# fix(deps): override the esbuild that drizzle-kit pulls through esbuild-kit

Issue: #11 · PR: #57 · Autor: Rubén

Nota convertida de las filas que este PR agregaba a la bitácora (D138).

## Historial

- 2026-10-22: **Alerta de Dependabot #18 → PR:** esbuild 0.18.20 (aviso GHSA-67mh-4wv8-2f99, sobre su servidor de desarrollo) entraba por drizzle-kit 0.31.11, que todavía declara `@esbuild-kit`, un paquete abandonado y fusionado en `tsx`. En la práctica el riesgo era nulo: nada usa ese servidor y drizzle-kit ni siquiera carga `@esbuild-kit`. Aun así, un `overrides` en `pnpm-workspace.yaml` lo sube a 0.25.12, la misma versión que drizzle-kit ya instala (D131), como se hizo con uuid en el #41. `drizzle-kit generate` funciona sin cambios. El override se quita cuando drizzle-kit deje `@esbuild-kit`.
