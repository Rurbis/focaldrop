# Resolución de agencia y reenvío desde Next — F1

Issue: #13 · PR: #78 · Autor: Fabian

## Decisiones

- **D-nueva · Caché pública de Next en Cloudflare** — Resultados públicos validados en R2 e invalidaciones por etiquetas en D1. Adelanta R2 respecto de D90 para completar F1. No agrega tablas de negocio ni migraciones en Supabase.
- Staging y previews usan recursos separados; cada compilación tiene un identificador que separa sus claves. Las previews no usan una referencia de servicio a staging. Esta entrega cachea resultados de funciones; la revalidación de páginas sigue en S-4.
- La clave incluye la URL de Nest y el host normalizado. La revalidación temporal es SWR, no una garantía estricta de frescura ante fallos. Invalidar Next no elimina la caché de cinco minutos de Nest; resolver una agencia nunca autoriza al usuario.
- El reenvío verifica el token de la cookie antes de enviarlo a Nest. Sobrescribe credenciales y host aportados por el navegador, limita cuerpos JSON y exige `Origin` del mismo sitio en mutaciones. Membresías y roles siguen en F3/F5.
- El endpoint de mantenimiento invalida una etiqueta fija con un secreto independiente. El despliegue valida IDs reales y credenciales antes de escribir en Cloudflare; una preview sin configuración se omite con aviso explícito, conservando las comprobaciones locales y de tamaño.

## Historial

- 2026-10-28: parte web de F1 sobre la rama del PR #61: resolución y validación del tenant, caché etiquetada, reenvío same-origin con sesión verificada, invalidación de mantenimiento y pruebas de fronteras HTTP. Un verificador inicia Next compilado y una API sintética para comprobar caché e invalidación sin usar BD ni staging.

## Tiempo

Estimación original de la parte web: 3 h. Implementación y validación local asistidas: aproximadamente 0.75 h hasta preparar el PR; revisión y configuración de infraestructura pendientes.

## Validación

- Windows, Node 24.22.1 y pnpm 10.34.6: lint, tipos y compilación correctos para web y shared; 169 pruebas unitarias correctas (118 web y 51 shared).
- Cinco pruebas del despliegue verifican el rechazo de IDs locales/configuración incompleta y la separación de recursos, sin comandos remotos.
- Next compilado con API sintética: caché reutilizada por host, invalidación real por etiqueta, agencias distintas, encabezados falsificados ignorados, 404/502 sin entradas negativas, exclusión de campos privados, rutas internas no expuestas y peticiones del panel sin cookie rechazadas.
- `pnpm format:check` y `git diff --check` correctos. El build/tamaño del Worker y la CI se verifican en Linux al publicar; la prueba remota R2/D1 depende de la configuración de infraestructura.

## Pendientes

- Integrar #61 y reapuntar esta PR a `main` conservando el diff de la parte web.
- Configurar R2/D1, permisos y variables/secreto de los Environments según `apps/web/README.md`; no se han creado recursos desde esta implementación local.
- Provisionar la agencia y su dominio en staging (#71), más el fallback cuando corresponda.
- Comprobar caché e invalidación sobre el Worker publicado, smoke positivo y observabilidad antes de cerrar #13.
