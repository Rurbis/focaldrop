# ADR-0010: Hosting del front, API en Cloud Run y caché de agencias

- Estado: aceptada · Fecha: 2026-11-26 · Reemplaza: — · Origen: D1, D5, D63, D83, D84, D90, D124, D129, D137 · Issues: #21, #25

## Contexto

Next.js 16 (`apps/web`) se despliega a Cloudflare Workers con OpenNext, y NestJS (`apps/api`) a Google Cloud Run (ADR-0002). El spike S-4 (#21) evaluó con mediciones reales en staging (`focaldrop-web-staging`, Next 16.4.5, OpenNext 1.20.12) si el panel autenticado cabe en Workers Free. La restricción que manda en Free es la **CPU (10 ms por petición)** y no el tamaño: la cuota vigente de Cloudflare es de **64 MiB sin comprimir** en Free y Paid (no existe límite comprimido; el valor `gzip` de Wrangler es solo de referencia), mientras que el tope de 2,816 KiB comprimidos en CI se conserva como **presupuesto interno nuestro**. F1 consulta a Nest con `no-store`, y Nest conserva una caché en memoria de cinco minutos por dominio.

## Decisión

- **Front en Cloudflare Workers (OpenNext):** se confirma Cloudflare Workers como host del front y se descarta Vercel Pro (US$20/mes). Se mantiene **Workers Free ($0)** durante desarrollo y staging porque las 136 peticiones medidas en staging terminaron `ok` sin errores `exceededCpu` (D5). Sin embargo, como el p50 del panel ya rebasa los 10 ms documentados (26 ms en `/admin`, 47 ms en `/admin/login`), se fija como **gatillo explícito subir a Workers Paid (US$5/mes)** al lanzar con la primera agencia —o antes si aparece el primer `exceededCpu` (error `1102`) en staging, si alguna ruta del panel o galería sostiene `p95 > 200 ms` de CPU en staging, o si el spike S-2 muestra que el Worker de ZIP rebasa el margen de Free—; una sola suscripción cubre el front y el Worker de ZIP (D83, D84). Para detectar el gatillo a tiempo (Workers Logs en Free solo retienen 3 días y la tolerancia de Cloudflare es para excesos poco frecuentes), se activa **Workers Issues** (beta abierta, gratis) previa comprobación de que captura el error `1102`; si no lo captura, se agrega un **workflow diario** contra la API de analíticas de Cloudflare que falle ante cualquier `exceededCpu`. Se conserva el chequeo de 2,816 KiB comprimidos en CI como presupuesto interno (~9.7 MiB sin comprimir, ~15 % del límite de 64 MiB).
- **Íconos estáticos:** ya atendido fuera de esta ADR en el PR #103 (se sirven desde `apps/web/public/` sin ejecutar el Worker, eliminando el 404 de `/favicon.ico` de 18–54 ms y la ruta `icon.svg` de 57 ms).
- **Caché de agencias en Next:** se mantiene `no-store` en Next por ahora; Nest conserva su caché en memoria de cinco minutos. Si futuras mediciones justifican caché persistente en el borde, se usará R2 para el contrato público validado y D1 para etiquetas (`agency-domains`), con la URL de Nest y el host normalizado en la clave, dejando sesiones, cookies, perfiles, respuestas autenticadas y errores fuera de la caché.
- **API en Cloud Run y arranque en frío:** se mantiene Cloud Run con escala a cero y `max-instances = 2` (ADR-0013). Tras 1 h sin uso, Nest superó el timeout de 10 s de `apps/web/src/lib/api/fetch.ts` y devolvió dos `504 API_TIMEOUT` antes de responder. Se descarta `min-instances = 1` por ahora: su costo ocioso (~US$9.7/mes brutos, ~US$4.5/mes tras nivel gratuito) nos dejaría al borde o por encima del presupuesto de **US$5 con corte automático (`billing-guard`, D124)**, apagando la API si no se sube antes el presupuesto. Se ataca en la issue #107: activar *Startup CPU Boost* en Cloud Run (costo despreciable dentro del nivel gratuito, ~US$0.0005 por arranque en frío), mantener el monitor gratuito cada 5 min de UptimeRobot sobre `/health` (D86, ya activo en staging; complementado en el Hito 1 por el cron cada 10 min de D46) y ampliar el timeout de `fetch.ts` —midiendo primero dónde se va el tiempo del arranque— con reintentos **solo en peticiones `GET` idempotentes** (nunca en `POST`).

## Consecuencias

**Positivas**

- Costo $0 en desarrollo y staging (D5); al lanzar, Workers Paid (US$5/mes) sigue 4× por debajo de Vercel Pro y cubre también el Worker de ZIP.
- Bundle medido en **9,730.51 KiB sin comprimir** (~15 % del límite de 64 MiB de Cloudflare) y **2,017.49 KiB** `gzip` (~72 % de nuestro presupuesto interno de 2,816 KiB en CI), con refresco de sesión verificado en staging y en el runtime local de Workers.
- Sin complejidad prematura de caché distribuida ni endpoints anticipados de invalidación en el Hito 0.

**Negativas**

- Workers Free opera por encima de la cuota nominal de 10 ms de CPU en `/admin` (p50 26 ms, p95 66 ms, máx 112 ms) y `/admin/login` (p50 47 ms, p95 497 ms, máx 519 ms), dependiendo de la tolerancia de Cloudflare hasta activar Paid.
- Compilación y despliegue del front con OpenNext siguen ligados a Linux/CI (D129). Sentry en servidor sigue desactivado por ahora, ya no por tamaño del Worker; reevaluar D145 (impacto en CPU de Free, validado con un deploy en preview) y corregir el texto obsoleto en `deploy-web.yml` ("de 3,072 KiB") y `apps/web/README.md` quedan en una issue aparte.

**Riesgos**

- Que Cloudflare corte peticiones por CPU al crecer el tráfico o sumar pantallas del Hito 1. Mitigación: detección automática (Workers Issues si cubre `1102`, o workflow diario contra la API de analíticas de Cloudflare) y activación inmediata de Workers Paid (US$5/mes).
- Que un reciclaje de instancia en Cloud Run siga provocando errores temporales en la primera visita. Mitigación: seguimiento dedicado en la issue #107.

## Alternativas descartadas

| Opción                                    | Por qué no                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workers Paid desde hoy (US$5/mes)         | Gasto anticipado mientras staging registra 0 cortes (`exceededCpu`); se activa al lanzar o ante el primer gatillo (D5).                                           |
| Vercel Pro (US$20/mes)                    | Cuatro veces más caro que Workers Paid y no cubre el Worker de ZIP; Hobby prohíbe uso comercial (D83).                                                            |
| `min-instances = 1` en Cloud Run          | ~US$9.7/mes brutos (~US$4.5/mes tras nivel gratuito); rozaría o rebasaría el tope de US$5 donde `billing-guard` apaga la API (D124). Exige subir presupuesto antes. |
| Cloudflare KV para caché en Next          | OpenNext solo ofrece D1 o Durable Objects para la caché de etiquetas (revalidación bajo demanda) y desaconseja KV en caché incremental por consistencia eventual.  |
| `use cache` / Cache Components de Next 16 | Hace fallar el prerender de `/admin/login` en la configuración actual y obliga a migrar rutas dinámicas a límites de Suspense.                                    |
