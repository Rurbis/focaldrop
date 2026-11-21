# ADR-0004: Drizzle con migraciones SQL versionadas; enumeraciones como `text` + `CHECK`; UUID v7

- Estado: aceptada · Fecha: 2026-10-11 · Reemplaza: — · Origen: D58, D67, D68, D106

## Contexto

Nest necesita un ORM con tipos de TypeScript. El esquema tiene detalles que importan más que la comodidad: RLS, roles de Postgres, índices parciales y claves foráneas compuestas (ADR-0001). Las migraciones tienen que poder revisarse en un PR y aplicarse igual en local, en CI y en staging. Y los identificadores no deben ser adivinables, porque aparecen en enlaces.

## Decisión

- **Drizzle** (D58): el esquema vive en TypeScript (`apps/api/src/db/schema/`) y las consultas se escriben cerca del SQL.
- **Migraciones como archivos `.sql` versionados** en `apps/api/drizzle/`, generados con `drizzle-kit generate` y revisados en el PR como cualquier código. Lo que Drizzle no expresa (RLS, el rol `app_api`, sus permisos) va a mano en la misma migración.
- **Quién las aplica:** `pnpm db:migrate`, en local y en el deploy de la API (`deploy-api.yml`), con el usuario administrador por el *session pooler*. Nunca con el rol de ejecución (`app_api`). Supabase no se conecta al repo, para que no haya dos sistemas migrando la misma base (D126).
- **Migraciones aditivas** (*expand/contract*, D106): primero se agrega, se despliega el código que lo usa, y solo después se quita lo viejo. El deploy migra antes de publicar la versión nueva.
- **Enumeraciones como `text` + `CHECK`** (D68), no como `ENUM` de Postgres: agregar un valor es una migración sencilla, y los tipos de TypeScript salen de los esquemas Zod.
- **Identificadores UUID v7** (D67), generados en Nest: no se adivinan, se conocen antes del `INSERT` y se ordenan por tiempo.

Detalle: [Parte B §3](../phase-1b-data-and-users.md) y la Fase 2 §3.

## Consecuencias

**Positivas**

- El SQL de cada cambio se lee en el PR; no hay migraciones mágicas al arrancar.
- Local, CI y staging aplican exactamente los mismos archivos.
- Los IDs sirven en URLs sin revelar cuántas galerías hay.

**Negativas**

- Lo que Drizzle no genera (RLS, permisos) se escribe a mano, y es fácil olvidarlo. Las pruebas de integración revisan los permisos del rol `app_api`.
- Si dos PRs crean migraciones a la vez, quien mezcla segundo regenera la suya (Fase 2 §3).

**Riesgos**

- Una migración destructiva por error. Mitigación: la revisión del SQL y la regla *expand/contract*.

## Alternativas descartadas

| Opción               | Por qué no                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Prisma               | Más abstracto y con su propio lenguaje de esquema; RLS e índices parciales a mano igual.  |
| TypeORM              | Decoradores y migraciones menos legibles; peor soporte de tipos en consultas complejas.   |
| `ENUM` de Postgres   | Cambiar sus valores exige migraciones delicadas.                                          |
| `serial` o UUID v4   | Los números se adivinan; el v4 no se ordena por tiempo y fragmenta los índices.           |
