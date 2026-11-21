# Caché persistente de la web — propuesta separada para F6

Issue: #21 · PR: #82 · Autor: Fabian

## Decisiones

- **D-nueva propuesta · Mantener Workers Free y evaluar R2/D1 para la caché pública** (precisa D83, D129 y D137) — [ADR-0010](../adr/0010-web-hosting.md). Mantener `no-store` en Next mientras se mide CPU en staging. Nest conserva su caché de cinco minutos. R2/D1 es el candidato a validar si las mediciones justifican almacenar el dato en Next.
- La caché solo podrá guardar el contrato público de agencias activas, con la URL de Nest y el host normalizado en la clave. Nunca cookies, JWT, perfiles ni respuestas autenticadas. La etiqueta requerida es `agency-domains`.
- `POST /api/cache/agency-domains` y su secreto quedan fuera. La invalidación se conectará a una mutación de dominio autorizada cuando exista; no se abre un endpoint de mantenimiento anticipado.

## Historial

- 2026-10-29: la revisión de Rubén al #78 separa el puente de F1 de la caché. La implementación anterior y su verificador están conservados en el [commit `30c6c99`](https://github.com/Rurbis/focaldrop/commit/30c6c9925c19978eb54e78fbe5a133de452a1703): son una referencia de trabajo, no una configuración para desplegar.
- 2026-11-20: avance de S-4 con #91 (`d8f6e4a`) y #97 (`01c43ac`) combinados en un checkout de prueba. Linux, Node 24.22.1, pnpm 10.34.6, Next 16.4.5, OpenNext 1.20.12 y Wrangler 4.148.0.

| Prueba           | Resultado                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build base y F1  | OpenNext y el verificador F1 pasaron. `wrangler deploy --dry-run` dio 9,730.51 KiB sin comprimir y **2,017.49 KiB** gzip.                                                                                                                                                                                                                       |
| Cache Components | Al activarlo para probar `use cache`, Next falla al prerenderizar `/admin/login` por datos de la petición fuera de un límite de Suspense. Activarlo requiere migrar esa ruta y revisar las demás.                                                                                                                                               |
| R2/D1 local      | Con Cache Components apagado, el prototipo de `unstable_cache` dio 10,161.56 KiB sin comprimir y **2,109.34 KiB** gzip. Wrangler local verificó reutilización entre peticiones, claves separadas por host, expiración corta, persistencia tras reiniciar workerd e invalidación inmediata con `revalidateTag('agency-domains', { expire: 0 })`. |
| `proxy.ts` local | En el mismo Worker, `/admin` sin sesión redirige al login. Con una sesión sintética vencida, el proxy llama una vez al refresco, emite una cookie `HttpOnly` y el panel responde 200 sin habilitar caché compartida.                                                                                                                            |
| Smoke de staging | `/`, `/admin/login` y `/api/public/tenant` respondieron 200 en el Worker que está desplegado.                                                                                                                                                                                                                                                   |

La prueba de caché usa marcadores sintéticos y R2/D1 locales. Para repetirla en Linux, compilar el panel, configurar los adaptadores `r2-incremental-cache` y `d1-next-tag-cache` con bindings locales, inicializar la tabla de revalidaciones del adaptador y ejecutar `wrangler dev --local --persist-to <directorio>`. En una ruta del experimento, guardar un marcador nuevo por argumento de host. Verificar que cada host repita su marcador, que ambos cambien después de invalidar la etiqueta y que el valor nuevo sobreviva al reinicio. La prueba solo corre en un checkout desechable.

La [documentación actual de Cloudflare](https://developers.cloudflare.com/workers/platform/limits/#worker-size) indica 64 MiB sin comprimir y ningún límite gzip. Los 3 MiB de gzip eran el umbral histórico de #21. Los 2,816 KiB siguen siendo el presupuesto interno del repo. El límite de CPU de Workers Free sigue en 10 ms por petición.

## Tiempo

Presupuesto del spike: 6 h. El tiempo total se registra al cerrar las mediciones.

## Pendientes

1. **Medir CPU en staging.** Con #97 integrado, tomar muestras de `/admin/login`, `/api/public/tenant` y `/admin` autenticado, incluido un refresco de sesión. En [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) filtrar por ruta y registrar versión, número de muestras, p50, p95, máximo y errores por CPU. Usar el tiempo de CPU que reporta Cloudflare. Medir por separado la duración de la primera visita tras un arranque en frío de Cloud Run.
2. **Validar caché remota si se necesita.** Usar un Worker de prueba con R2/D1 propios. Verificar dos hosts sintéticos, que invalidar uno de los entornos no afecte al otro, reutilización, expiración y recuperación tras una falla sin caché negativa. Comparar CPU y duración total con la configuración base. Medir antes de activar un binding en staging. Mantener la invalidación en la futura mutación autorizada de dominio y reflejar los cinco minutos de caché de Nest.
3. **Cerrar S-4.** Registrar en #21 los números y capturas sin datos de agencia. Ratificar o actualizar ADR-0010 según el resultado. #21 y #25 siguen abiertos mientras falte evidencia del Worker publicado.
