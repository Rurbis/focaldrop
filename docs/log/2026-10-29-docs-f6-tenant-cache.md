# Caché persistente de la web — propuesta separada para F6

Issue: #21 · PR: #82 · Autor: Fabian

## Decisiones

- **D-nueva propuesta · Evaluar la caché persistente en F6/S-4** — Se extrae del #78 para que F1 se pueda desplegar sin activar R2 ni crear D1. El núcleo consulta Nest con `no-store`; Nest conserva su caché de cinco minutos. La elección del almacenamiento queda pendiente de mediciones y de ADR-0010; este documento no aprueba recursos nuevos.
- La caché solo podrá guardar el contrato público de agencias activas, con la URL de Nest y el host normalizado en la clave. Nunca cookies, JWT, perfiles ni respuestas autenticadas. La etiqueta requerida es `agency-domains`.
- `POST /api/cache/agency-domains` y su secreto quedan fuera. La invalidación se conectará a una mutación de dominio autorizada cuando exista; no se abre un endpoint de mantenimiento anticipado.

## Historial

- 2026-10-29: la revisión de Rubén al #78 separa el puente de F1 de la caché. La implementación anterior y su verificador están conservados en el [commit `30c6c99`](https://github.com/Rurbis/focaldrop/commit/30c6c9925c19978eb54e78fbe5a133de452a1703): son una referencia de trabajo, no una configuración para desplegar.

## Pendientes

1. **Elegir y registrar el almacenamiento.** [OpenNext](https://opennext.js.org/cloudflare/caching) admite R2 y KV como caché incremental; desaconseja KV por consistencia eventual. KV evita adelantar la activación de R2 de D90, pero hay que medir su propagación e invalidación. R2 más D1 usa almacenamiento y etiquetas separados; exige activar recursos y medir su costo de CPU. Comparar ambas opciones con las versiones fijadas y documentar el resultado en ADR-0010.
2. **Elegir la API de Next.** Next 16 recomienda [`use cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache) en lugar de `unstable_cache`. Comprobar Cache Components, `cacheTag` y revalidación con el adaptador fijado de OpenNext antes de adoptar cualquiera. Una prueba con Next local no demuestra el comportamiento de Workers.
3. **Configurar únicamente recursos reales.** Si se elige D1, sus IDs van directamente en `wrangler.jsonc`; no son secretos. Sin IDs ficticios, sin script que reescriba Wrangler y sin un entorno `cache-preview` duplicado. Mantener los comentarios de D137 y la separación entre staging y previews, que nunca deben revalidar contra staging.
4. **Validar el Worker publicado.** Medir tamaño comprimido contra el presupuesto de 2,816 KiB y CPU por petición contra los 10 ms de S-4. Comprobar separación de hosts y previews, reutilización entre peticiones, expiración, invalidación por etiqueta y recuperación de errores sin caché negativa. No cerrar #21 hasta tener esos resultados.
5. **Documentar la frescura.** Explicar el comportamiento ante fallos y los cinco minutos de la caché de Nest: invalidar Next no elimina aquella caché ni constituye autorización.

## Tiempo

El tiempo de implementación y medición de la caché se registra con F6; esta separación documenta su alcance y conserva la referencia del trabajo previo.
