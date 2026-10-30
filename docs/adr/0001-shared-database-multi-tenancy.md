# ADR-0001: Una base de datos compartida, con `agency_id` en todas las tablas

- Estado: aceptada · Fecha: 2026-10-11 · Reemplaza: — · Origen: B2, D7, D40, D59, D60, D69

## Contexto

Focal Drop nace para una agencia, pero el objetivo es venderlo a varias (SaaS, *white-label*). Cada agencia ve solo sus galerías, clientes y archivos, y entra por su propio dominio. Somos dos personas con presupuesto cero: una base de datos o un esquema por agencia multiplicaría las migraciones, las conexiones y el costo, y el plan gratuito de Supabase da dos proyectos (staging y producción).

## Decisión

- **Una sola base de datos** (Supabase Postgres) para todas las agencias. Cada tabla de datos de una agencia lleva `agency_id`.
- **La agencia sale del dominio:** Next manda el host original en `X-Tenant-Host`, y Nest lo resuelve contra `agency_domains`, con caché en memoria de 5 minutos (D40, #13). El host solo elige el contexto **público**; los permisos salen del JWT y de la membresía (ADR-0003, #12 y #14).
- **Respaldo fuera de producción (D7):** en local y en staging (`APP_ENV`), un host desconocido usa la agencia de `DEFAULT_AGENCY_SLUG`. Así funcionan las previews de cada PR sin registrar su dominio. Producción se niega a arrancar si tiene esa variable.
- **Aislamiento por capas (D59):**
  1. Contexto de agencia por petición (`nestjs-cls`), *guards* y repositorios que exigen `agency_id`, con pruebas e2e que intentan cruzar agencias (#14).
  2. RLS en todas las tablas: sin políticas para `anon` ni `authenticated`, y Nest entra con el rol `app_api` (D60). **Antes de dar de alta una segunda agencia**, `app_api` pasa de "todo permitido" a políticas por agencia (`set_config('app.agency_id', …)` por transacción).
- **La base garantiza la pertenencia (D69):** desde las tablas de galerías (hito 1), las claves foráneas son compuestas `(id, agency_id)`, para que un hijo no pueda colgar de un padre de otra agencia.

Detalle: [Parte B §2 y §5](../phase-1b-data-and-users.md).

## Consecuencias

**Positivas**

- Un esquema, una migración y un pool para todas las agencias; agregar una agencia es insertar filas (`pnpm db:provision`, #71).
- El aislamiento no depende de una sola línea de código: hay *guards*, repositorios, RLS y la integridad de la base.

**Negativas**

- Cada consulta nueva debe filtrar por el `agency_id` del contexto, nunca por uno que llegue en el cuerpo. Es parte de la revisión de cada PR (Fase 2 §7.3).
- Una agencia muy grande comparte recursos con las demás.

**Riesgos**

- Una fuga entre agencias por un repositorio mal escrito. Mitigación: la prueba e2e de cruce entre agencias (#14) y RLS por agencia antes de la segunda.
- Que el respaldo de D7 llegue a producción. Mitigación: la validación de arranque lo impide.

## Alternativas descartadas

| Opción                        | Por qué no                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Una base de datos por agencia | Migraciones y conexiones por agencia, y el plan gratuito solo da dos proyectos.                    |
| Un esquema por agencia        | Migraciones repetidas por esquema y un pool más complejo; Drizzle no lo resuelve solo.             |
| Solo RLS, sin capa en Nest    | Errores difíciles de depurar y todo el aislamiento en políticas SQL; se usa como segunda capa.     |
