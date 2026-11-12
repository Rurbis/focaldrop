# feat(api): enforce tenant membership, roles and scoped repositories

Issue: #14 · Autor: Fabian

## Decisiones

- **D-nueva · La autorización se resuelve en la agencia del contexto y cada repositorio privado impone ese alcance** (precisa D59 y D107).
  - Orden: `AuthGuard` verifica el usuario, `TenantGuard` lee su membresía actual y `RolesGuard` aplica `@Roles()`. Los roles del JWT, del cuerpo e `is_platform_admin` no conceden acceso al panel de otra agencia.
  - `@CurrentMember()` entrega la membresía comprobada; `/admin/me` reutiliza esa lectura. Mantiene el 403 acordado en F3 con una política explícita; los recursos privados devuelven 404 si falta membresía o si la fila pertenece a otra agencia.
  - `TenantRepository` impone el filtro de agencia en SELECT, UPDATE y DELETE, y fija su valor en INSERT y UPDATE incluso si llega otro `agencyId` en un objeto. Sin contexto falla antes de consultar la BD. El repositorio de membresías ya lo usa; descubrimiento público y aprovisionamiento administrativo conservan sus caminos explícitos.
  - `pnpm test` de la API ejecuta unitarias y HTTP con cobertura: mínimo 90 % por archivo de guard en sentencias, ramas, funciones y líneas. Después ejecuta las integraciones. No se agregan dependencias.

## Historial

- 2026-11-11: **F5 (#14), aislamiento entre agencias.** Guards y repositorio base conectados a `/admin/me`, sin cambiar su contrato. Pruebas HTTP con JWT ES256 y JWKS local; integraciones con las tablas existentes y permisos `app_api` en PostgreSQL desechable. El usuario de A recibe 404 al leer, modificar o borrar una fila de B; tampoco puede ganar acceso cambiando el host, el cuerpo o los roles del JWT. Se comprueban escrituras propias, revocación de membresía, roles distintos por agencia y peticiones concurrentes. Los controladores de prueba no forman parte de la API publicada.
- Validación final local: 230 pruebas unitarias/HTTP, 28 integraciones y 56 pruebas de shared correctas; guards con 100 % de cobertura. Lint, tipos y build correctos en las ocho tareas de API/shared. La base y el contenedor usados para verificarlo se eliminan al terminar, sin usar desarrollo ni staging.

## Tiempo

- Estimación de la issue: 5 h; implementación, pruebas y preparación del PR: aproximadamente 1.5 h asistidas, con las comprobaciones de integración incluidas. La espera y correcciones posteriores de revisión se registrarán al cierre.

## Pendientes

- Revisión de Rubén y comprobación posterior al despliegue de staging. La F3 web sigue en #89; esta entrega usa la API de F3 ya integrada en `main`.
- El token local no tiene permisos de Projects para mover la tarjeta a «En curso»; la issue sí quedó asignada a Fabian (`AntonioWalls`).
- Hito 1: cada repositorio de clientes y galerías usará esta base, y sus controladores aplicarán los guards en el orden documentado. RLS por agencia sigue siendo la segunda capa previa a una segunda agencia real, según ADR-0001.
