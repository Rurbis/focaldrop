# ADR-0010: Hosting del front y caché de agencias

- Estado: propuesta · Fecha: 2026-11-20 · Origen: D1, D63, D83, D90, D129, D137 · Issues: #21, #25

## Contexto

Next ya se despliega a Cloudflare Workers con OpenNext y Nest a Cloud Run. S-4 debe verificar que el panel cabe en Workers Free, incluido el trabajo de CPU al renderizar con una sesión. F1 consulta Nest con `no-store`; Nest mantiene cinco minutos de caché de agencia por dominio.

## Decisión propuesta

- Mantener Cloudflare Workers Free para Next y Cloud Run para Nest. Ratificar la decisión cuando el panel autenticado y el refresco de sesión queden dentro de los 10 ms de CPU por petición en staging. Conservar el presupuesto interno de 2,816 KiB comprimidos de CI.
- Mantener `no-store` en Next por ahora. Si las mediciones justifican una caché persistente, usar R2 para el valor público validado y D1 para las etiquetas. Incluir la URL de Nest y el host normalizado en la clave. Dejar sesiones, cookies, perfiles, respuestas autenticadas y errores fuera de la caché.
- Antes de activar R2/D1, comprobar la invalidación en un Worker de prueba con recursos separados. La mutación autorizada de dominios debe invalidar también la caché de Nest. Las previews conservan `no-store` hasta tener recursos aislados y una autorreferencia propia.

## Evidencia y consecuencias

Con Next 16.4.5 y OpenNext 1.20.12, el panel de #91 combinado con #97 pesa **2,017.49 KiB** comprimidos en Linux. En el runtime local de Workers, un prototipo R2/D1 pesa **2,109.34 KiB** y valida reutilización, separación de hosts, expiración e invalidación inmediata por etiqueta. El proxy refresca una sesión sintética vencida. Falta CPU y validación de la caché en Cloudflare. [Resultados y pasos de S-4](https://github.com/Rurbis/focaldrop/pull/82).

## Alternativas

- **KV:** puede servir para datos cuya propagación demorada sea aceptable. Para invalidar dominios, se prefiere probar R2/D1 porque OpenNext desaconseja KV por consistencia eventual. [Caché de OpenNext](https://opennext.js.org/cloudflare/caching).
- **`use cache`:** requiere migrar rutas a Cache Components y comprobar el almacenamiento en el runtime. Activarlo en la combinación actual hace fallar el prerender de `/admin/login`. [Documentación de Next](https://nextjs.org/docs/app/api-reference/directives/use-cache).
- **Otro plan u host:** si la CPU supera el límite, medir qué rutas lo causan antes de decidir optimización, Workers Paid o el respaldo de D83.
