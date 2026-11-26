# ADR-0010: Hosting del front, API en Cloud Run y caché de agencias

- Estado: aceptada · Fecha: 2026-11-25 · Reemplaza: — · Origen: D1, D5, D63, D83, D84, D90, D129, D137 · Issues: #21, #25

## Contexto

Next.js 16 (`apps/web`) se despliega a Cloudflare Workers con OpenNext, y NestJS (`apps/api`) a Google Cloud Run (ADR-0002). El spike S-4 (#21) debía verificar con mediciones reales en staging (`focaldrop-web-staging`, Next 16.4.5, OpenNext 1.20.12) si el panel autenticado cabe en Workers Free (límite de 10 ms de CPU por petición y presupuesto interno de 2,816 KiB comprimidos). F1 consulta a Nest con `no-store`, mientras Nest conserva una caché en memoria de cinco minutos por dominio.

## Decisión

- **Front en Cloudflare Workers (OpenNext):** se confirma Cloudflare Workers como host del front y se descarta Vercel Pro (US$20/mes). Se mantiene **Workers Free ($0)** durante desarrollo y staging porque las 136 peticiones medidas en staging terminaron `ok` sin errores `exceededCpu` (D5). Sin embargo, como el p50 del panel ya rebasa los 10 ms documentados (26 ms en `/admin`, 47 ms en `/admin/login`), se fija como **gatillo explícito subir a Workers Paid (US$5/mes)** al lanzar con la primera agencia —o antes si aparece el primer `exceededCpu` en staging o el Hito 1 exige más margen—; una sola suscripción cubre el front y el Worker de ZIP (D83, D84). Se conserva el presupuesto de 2,816 KiB comprimidos en CI.
- **Íconos estáticos:** ya atendido fuera de esta ADR en el PR #103 (se sirven desde `apps/web/public/` sin ejecutar el Worker, eliminando el 404 de `/favicon.ico` de 18–54 ms y la ruta `icon.svg` de 57 ms).
- **Caché de agencias en Next:** se mantiene `no-store` en Next por ahora; Nest conserva su caché en memoria de cinco minutos. Si futuras mediciones justifican caché persistente en el borde, se usará R2 para el contrato público validado y D1 para etiquetas (`agency-domains`), con la URL de Nest y el host normalizado en la clave, dejando sesiones, cookies, perfiles, respuestas autenticadas y errores fuera de la caché.
- **API en Cloud Run y arranque en frío:** se mantiene Cloud Run con escala a cero y `max-instances = 2` (ADR-0013). Tras 1 h sin uso, Nest superó el timeout de 10 s de `apps/web/src/lib/api/fetch.ts` y devolvió dos `504 API_TIMEOUT` antes de responder. Se descarta `min-instances = 1` (~US$8–10/mes) por ahora y se ataca sin costo en la issue #107: activar *Startup CPU Boost* en Cloud Run, activar el monitor gratuito cada 5 min de UptimeRobot (D86; complementado en el Hito 1 por el cron cada 10 min de D46) y ampliar el timeout de `fetch.ts` con un manejo limpio de espera/reintento.

## Consecuencias

**Positivas**

- Costo $0 en desarrollo y staging (D5); al lanzar, Workers Paid (US$5/mes) sigue 4× por debajo de Vercel Pro y cubre también el Worker de ZIP.
- Bundle medido en **2,017.49 KiB** gzip (~72 % del presupuesto de 2,816 KiB) y refresco de sesión verificado en staging y en el runtime local de Workers.
- Sin complejidad prematura de caché distribuida ni endpoints anticipados de invalidación en el Hito 0.

**Negativas**

- Workers Free opera por encima de la cuota nominal de 10 ms de CPU en `/admin` (p50 26 ms, p95 66 ms, máx 112 ms) y `/admin/login` (p50 47 ms, p95 497 ms, máx 519 ms), dependiendo de la tolerancia de Cloudflare hasta activar Paid.
- Compilación y despliegue del front con OpenNext siguen ligados a Linux/CI (D129), y Sentry en servidor sigue desactivado hasta reevaluarlo con Workers Paid (D145).

**Riesgos**

- Que Cloudflare corte peticiones por CPU al crecer el tráfico o sumar pantallas del Hito 1. Mitigación: vigilancia en Workers Logs y activación inmediata de Workers Paid (US$5/mes).
- Que un reciclaje de instancia en Cloud Run siga provocando errores temporales en la primera visita. Mitigación: seguimiento dedicado en la issue #107.

## Alternativas descartadas

| Opción                                    | Por qué no                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Workers Paid desde hoy (US$5/mes)         | Gasto anticipado mientras staging registra 0 cortes (`exceededCpu`); se activa al lanzar o ante el primer corte (D5).                         |
| Vercel Pro (US$20/mes)                    | Cuatro veces más caro que Workers Paid y no cubre el Worker de ZIP; Hobby prohíbe uso comercial (D83).                                       |
| `min-instances = 1` en Cloud Run          | ~US$8–10/mes fijos durante el desarrollo; se aplican primero medidas sin costo (Startup CPU Boost, UptimeRobot y timeout).                  |
| Cloudflare KV para etiquetas de caché     | OpenNext desaconseja KV por consistencia eventual al invalidar dominios; se prefiere R2/D1 si llegara a necesitarse.                         |
| `use cache` / Cache Components de Next 16 | Hace fallar el prerender de `/admin/login` en la configuración actual y obliga a migrar rutas dinámicas a límites de Suspense.               |
