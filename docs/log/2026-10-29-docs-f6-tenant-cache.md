# F6 · S-4 y ADR-0010: hosting del front, Cloud Run y caché de agencias

Issues: #21 y #25 · PR: #82 · Autor: Fabian

## Decisiones

- **D-nueva · Confirmar Cloudflare Workers para el front (Free en desarrollo/staging, gatillo observable a Paid) y mantener `no-store` en Next por ahora** (precisa D1, D5, D83, D84, D124, D129, D137 y D148) — [ADR-0010](../adr/0010-web-hosting.md). Las mediciones en staging (`focaldrop-web-staging`, versión `4dee763c`) confirmaron 0 errores `exceededCpu` en 136 peticiones, aunque el p50 del panel ya rebasa los 10 ms nominales (26 ms en `/admin`, 47 ms en `/admin/login`). La restricción real de Free es la CPU (10 ms) y no el tamaño (el límite vigente en Cloudflare es 64 MiB sin comprimir en Free y Paid; 2,816 KiB `gzip` queda como presupuesto interno en CI). Se conserva Workers Free ($0) mientras no haya cortes, con gatillo explícito a Workers Paid (US$5/mes) al lanzar con la agencia, al primer `exceededCpu` (`1102`), si alguna ruta sostiene `p95 > 200 ms` de CPU en staging o si S-2 exige más margen; el gatillo se vigila automáticamente con Workers Issues (si cubre `1102`) o un workflow diario contra la API de analíticas de Cloudflare. Next mantiene `no-store` (Nest conserva su caché de cinco minutos); si futuras mediciones justifican caché persistente, el candidato validado en local es R2/D1 con etiqueta `agency-domains`. El arranque en frío de Cloud Run (>10 s tras 1 h sin uso) se atiende en la issue #107 (*Startup CPU Boost* de costo despreciable en el nivel gratuito, monitor cada 5 min de UptimeRobot ya activo en staging, y ajuste de timeout tras medir arranque con reintento solo en `GET`), descartando `min-instances = 1` (~US$9.7/mes brutos, ~US$4.5/mes tras nivel gratuito) porque rozaría o rebasaría el presupuesto de US$5 donde `billing-guard` corta la facturación (D124).

## Historial

- 2026-10-29: la revisión de Rubén al #78 separa el puente de F1 de la caché. La implementación anterior y su verificador quedan en el [commit `30c6c99`](https://github.com/Rurbis/focaldrop/commit/30c6c9925c19978eb54e78fbe5a133de452a1703) como referencia de trabajo.
- 2026-11-20: avance de S-4 con #91 (`d8f6e4a`) y #97 (`01c43ac`) en un checkout de prueba (Linux, Node 24.22.1, pnpm 10.34.6, Next 16.4.5, OpenNext 1.20.12, Wrangler 4.148.0).

| Prueba           | Resultado                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build base y F1  | OpenNext y el verificador F1 pasaron. `wrangler deploy --dry-run` dio 9,730.51 KiB sin comprimir y **2,017.49 KiB** gzip.                                                                                                                                                                                                                       |
| Cache Components | Al activarlo para probar `use cache`, Next falla al prerenderizar `/admin/login` por datos de la petición fuera de un límite de Suspense.                                                                                                                                                                                                         |
| R2/D1 local      | Con Cache Components apagado, el prototipo con `unstable_cache` dio 10,161.56 KiB sin comprimir y **2,109.34 KiB** gzip. Wrangler local verificó reutilización entre peticiones, claves separadas por host, expiración corta, persistencia tras reiniciar workerd e invalidación inmediata con `revalidateTag('agency-domains', { expire: 0 })`. |
| `proxy.ts` local | `/admin` sin sesión redirige al login; con una sesión sintética vencida, el proxy refresca una vez, emite cookie `HttpOnly` y el panel responde 200 sin habilitar caché compartida.                                                                                                                                                                |

- 2026-11-23: **mediciones en staging medidas por Rubén sobre `focaldrop-web-staging` (`4dee763c`, #91 + #97):**

| Ruta                                        | Muestras | p50   | p95    | Máximo |
| ------------------------------------------- | -------- | ----- | ------ | ------ |
| `/admin` autenticado                        | 30       | 26 ms | 66 ms  | 112 ms |
| `/admin/login` (incluye el POST del login)  | 34       | 47 ms | 497 ms | 519 ms |
| `/api/public/tenant`                        | 33       | 10 ms | 116 ms | 144 ms |
| `/admin` con refresco de sesión e isolate   | 1        | 322 ms | —     | —      |

  - **CPU del Worker:** 0 errores `exceededCpu` en las 136 invocaciones (`ok`); el refresco de sesión funcionó tras vencer el token. Los íconos estáticos que quemaban CPU (`/favicon.ico` 18–54 ms por 404 y `icon.svg` 57 ms) quedaron resueltos aparte en el PR #103 moviéndolos a `apps/web/public/`.
  - **Arranque en frío de Cloud Run:** tras 1 h sin uso, Nest no contestó dentro del timeout de 10 s de `apps/web/src/lib/api/fetch.ts`: carga 1 tardó 11,075 ms (1,742 ms TTFB), carga 2 dio `504 API_TIMEOUT` a los 10,003 ms, y carga 3 respondió completa en 1,270 ms.
- 2026-11-25: **cierre de S-4 (#21) y ADR-0010 (#25) en PR #82** con las mediciones de staging, decisión de Workers Free con gatillo explícito a Paid (US$5/mes) y seguimiento gratuito del arranque en frío en la issue #107.
- 2026-11-26: **ajustes tras la revisión de Rubén al PR #82:** se aclara que el límite vinculante en Workers Free es la CPU (10 ms) y no el tamaño (64 MiB sin comprimir; 2,816 KiB `gzip` queda como presupuesto interno de CI), se vuelve observable el gatillo a Paid (Workers Issues si captura `1102` o workflow diario contra la API de analíticas de Cloudflare, además de `p95 > 200 ms`), se precisa el costo despreciable de *Startup CPU Boost*, el corte de US$5 (`billing-guard`, D124) como razón contra `min-instances = 1`, la justificación exacta de OpenNext contra KV (*eventually consistent* en caché incremental) y la sincronización de `Origen` en `docs/adr/README.md`.

## Tiempo

- #21 (S-4, F6) y #25 (ADR-0010): presupuesto del spike 6 h; análisis de caché, pruebas en Workers local, cierre de ADR-0010 y revisión en curso (≈ 2.5 h registradas entre sesiones asistidas; medición en staging aparte por Rubén).

## Pendientes

- **Gatillo observable a Workers Paid (US$5/mes):** verificar que **Workers Issues** captura `exceededCpu` (`1102`); si no lo captura, crear el workflow diario contra la API de analíticas de Cloudflare. Activar Paid al lanzar con la primera agencia, al primer `exceededCpu` (`1102`), si alguna ruta sostiene `p95 > 200 ms` de CPU en staging o si S-2 rebasa Free.
- **Revisión de D145 y textos de tamaño (issue aparte):** probar en una preview el impacto real de Sentry en servidor sobre la CPU de Workers Free (descartado que el tamaño lo bloquee) y corregir las menciones obsoletas al límite de 3 MiB (`3,072 KiB`) en `.github/workflows/deploy-web.yml` y `apps/web/README.md`.
- **Arranque en frío de Cloud Run (#107):** con el monitor de UptimeRobot cada 5 min ya activo en staging, medir latencia de arranque del contenedor y de NestJS, activar *Startup CPU Boost* y ampliar el timeout de `apps/web/src/lib/api/fetch.ts` con reintento solo en `GET`.
- **Validar R2/D1 remoto solo si se reactiva la caché en Next:** si futuras mediciones exigen caché persistente, probar en un Worker separado antes de agregar bindings a staging y conectar la invalidación a la mutación autorizada de dominios.
