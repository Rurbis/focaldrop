# feat(api): enforce tenant membership and scoped data access

Issue: #14 · PR: #92 · Autor: Fabian

## Decisiones

- **D-nueva · La autorización se resuelve en la agencia del contexto y cada repositorio privado impone ese alcance** (precisa D59 y D107).
  - Orden: `AuthGuard` verifica el usuario, `TenantGuard` lee su membresía actual y `RolesGuard` aplica `@Roles()`. Los roles del JWT, del cuerpo e `is_platform_admin` no conceden acceso al panel de otra agencia.
  - `@CurrentMember()` entrega la membresía comprobada; `/admin/me` reutiliza esa lectura. Mantiene el 403 acordado en F3 con una política explícita; los recursos privados devuelven 404 si falta membresía o si la fila pertenece a otra agencia.
  - `TenantRepository` impone el filtro de agencia en SELECT, UPDATE y DELETE, y fija su valor en INSERT y UPDATE incluso si llega otro `agencyId` en un objeto. Sin contexto falla antes de consultar la BD. El repositorio de membresías ya lo usa; descubrimiento público y aprovisionamiento administrativo conservan sus caminos explícitos.
  - ESLint prohíbe `$dynamic` y `onConflictDoUpdate` en `apps/api/src`, salvo `src/db/**`: el primero permite reemplazar el filtro y el segundo puede modificar una fila ajena en un conflicto único. Los filtros opcionales se pasan a `selectForTenant`, que acepta `undefined`. La restricción cubre acceso por punto y por corchetes, con pruebas contra la configuración real de ESLint.
  - `pnpm test` de la API ejecuta unitarias y HTTP con cobertura: mínimo 90 % por archivo de guard en sentencias, ramas, funciones y líneas. Después ejecuta las integraciones. No se agregan dependencias.

## Historial

- 2026-11-11: **F5 (#14), aislamiento entre agencias.** Guards y repositorio base conectados a `/admin/me`, sin cambiar su contrato. Pruebas HTTP con JWT ES256 y JWKS local; integraciones con las tablas existentes y permisos `app_api` en PostgreSQL desechable. El usuario de A recibe 404 al leer, modificar o borrar una fila de B; tampoco puede ganar acceso cambiando el host, el cuerpo o los roles del JWT. Se comprueban escrituras propias, revocación de membresía, roles distintos por agencia y peticiones concurrentes. Los controladores de prueba no forman parte de la API publicada.
- Validación final local: 230 pruebas unitarias/HTTP, 28 integraciones y 56 pruebas de shared correctas; guards con 100 % de cobertura. Lint, tipos y build correctos en las ocho tareas de API/shared. La base y el contenedor usados para verificarlo se eliminan al terminar, sin usar desarrollo ni staging.
- 2026-11-17: atendido el P2 de Rubén con la restricción de ESLint, filtros opcionales sin `$dynamic` y documentación explícita del límite de los builders. Se agregan ocho regresiones de filtros y política de consultas.
- Validación de la corrección con Node 24.22.1 y pnpm 10.34.6: formato y las 12 tareas de lint, tipos, pruebas y build del monorepo correctas; 238 pruebas unitarias/HTTP de API, 28 integraciones en PostgreSQL 17 desechable de Supabase, 139 pruebas web y 56 de shared. Guards al 100 % en las cuatro métricas.

## Tiempo

- Estimación de la issue: 5 h; implementación, pruebas y preparación del PR: aproximadamente 1.5 h asistidas, con las comprobaciones de integración incluidas. La espera y correcciones posteriores de revisión se registrarán al cierre.

## Pendientes

- Nueva revisión de Rubén y comprobación posterior al despliegue de staging. F3 web ya quedó integrada con #89.
- El token local no tiene permisos de Projects para mover la tarjeta a «En curso»; la issue sí quedó asignada a Fabian (`AntonioWalls`).
- Hito 1: cada repositorio de clientes y galerías usará esta base, y sus controladores aplicarán los guards en el orden documentado. RLS por agencia sigue siendo la segunda capa previa a una segunda agencia real, según ADR-0001.
