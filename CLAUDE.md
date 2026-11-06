# Focal Drop · guía para agentes de código

Guía para Claude Code (y cualquier otro agente) en este repo. Parte de la Parte C §8 (D97), con los comandos reales.

## Qué es

Plataforma multi-tenant para agencias de fotografía: sitio público por agencia y entrega de galerías privadas que vencen. Primera agencia: una real, en México. Interfaz en es-MX. Dos desarrolladores a tiempo parcial; el objetivo es entender y poder defender cada decisión.

## Antes de cambiar algo

1. Lee la [bitácora](docs/project-log.md) (decisiones D#), las notas pendientes de integrar en [`docs/log/`](docs/log/) y el ADR del área en [`docs/adr/`](docs/adr/).
2. Si una decisión estorba, propón un ADR nuevo que la reemplace; no la cambies en silencio.
3. Si falta información, pregunta con opciones, con la recomendada primero; marca lo asumido como **Supuesto**.
4. Lo que no es Must del hito en curso va al backlog, no al PR ([Parte C §3](docs/phase-1c-scope-and-closing.md)).

## Reglas que no se negocian

- **El repo es público.** Nada de la agencia en el código ni en los docs (nombre, logo, colores, textos, datos de sus clientes): todo viene de la BD. Tampoco datos personales ni detalles de las cuentas (D128).
- **Secretos** solo en `.env` locales (ignorados por Git), GitHub Environments, Secret Manager o Bitwarden. Nunca en el repo, en el front, en issues ni en logs.
- **Toda consulta** lleva el `agency_id` del contexto de la petición, nunca del body. Un recurso de otra agencia responde 404 (ADR-0001).
- **Next renderiza, Nest decide** (ADR-0002): solo Nest toca la BD y decide permisos. El navegador solo habla con su mismo origen; Next reenvía `/api/*` a Nest.
- **Los archivos nunca pasan por Next ni por Nest:** el navegador habla directo con R2, y el ZIP lo arma el Worker.
- **Transiciones de estado:** `UPDATE … WHERE status = … RETURNING` más su fila en el outbox, en la misma transacción.
- **Cero costo** fuera de los planes gratuitos, salvo lo listado en la bitácora §4.1.
- **Dependencias:** versiones exactas y con al menos 14 días publicadas, salvo arreglos de seguridad (D131).

## Estructura

- `apps/web`: Next.js 16 (App Router) en Cloudflare Workers con OpenNext. Renderiza y reenvía `/api/*` a Nest.
- `apps/api`: NestJS en Cloud Run. Reglas de negocio, datos (Drizzle), firmas de R2, avisos y cron.
- `packages/shared`: esquemas Zod y tipos que comparten la web y la API.
- `apps/zip-worker` (hito 1): Cloudflare Worker que arma el ZIP desde R2.
- `infra/`: Supabase local (`infra/supabase`) y el arranque de Google Cloud (`infra/gcp`).

## Convenciones

- Código, identificadores, ramas y commits en inglés; interfaz y docs en español (es-MX). Los textos de interfaz viven en el diccionario `apps/web/src/i18n/es-MX.ts`.
- **Conventional Commits** con _scope_ (`feat(api): …`). Ramas cortas desde `main` (`feat/`, `fix/`, `chore/`, `docs/`, `ci/`).
- Tablas `snake_case` en plural; enumeraciones como `text` + `CHECK`; IDs UUID v7 generados en Nest; dinero en centavos; fechas `timestamptz` en UTC (ADR-0004). JSONB solo con un esquema Zod en `packages/shared`.
- Migraciones aditivas (_expand/contract_), generadas con `pnpm db:generate` y revisadas en el PR.

## Cómo se trabaja (D138, Fase 2 §3)

- Cada issue es una **feature vertical** (BD, API, web, pruebas y docs) de una sola persona. Se toma la de más arriba de "Hito actual" en el tablero, se asigna y se mueve a "En curso" antes de empezar. Una a la vez.
- **Cada PR deja una nota en `docs/log/`** ([formato](docs/log/README.md)) en lugar de editar la bitácora. Las decisiones nuevas van como "D-nueva"; el número lo asigna la integración semanal.
- El PR sigue la plantilla y su checklist. El otro lo revisa **en local**, y el autor mezcla con _squash_ después de la aprobación y con la CI en verde.
- Nunca `--no-verify` ni saltarse los _hooks_.

## Comandos

Requisitos: Node **24.22.1** (`.nvmrc`; `pnpm install` rechaza versiones anteriores), pnpm **10.34.6** y Docker Desktop para Supabase local. Detalle en el [README](README.md).

| Comando                                         | Qué hace                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm install`                                  | Instala todo el monorepo                                                        |
| `pnpm dev`                                      | Web en `localhost:3000` y API en `localhost:3001`                               |
| `pnpm lint` · `pnpm typecheck`                  | ESLint con tipos y TypeScript estricto                                          |
| `pnpm test` · `pnpm build`                      | Pruebas (Vitest) y build de todo                                                |
| `pnpm format:check` · `pnpm format`             | Prettier                                                                        |
| `pnpm db:start` · `pnpm db:stop`                | Supabase local en Docker                                                        |
| `pnpm db:generate`                              | Genera la migración a partir del esquema de Drizzle                             |
| `pnpm db:migrate` · `pnpm db:seed`              | Aplica migraciones y crea la agencia de demo local                              |
| `pnpm db:reset`                                 | Borra Supabase local, migra y siembra de nuevo                                  |
| `pnpm --filter @focaldrop/api test:integration` | Pruebas con Postgres real; necesitan `TEST_DATABASE_URL` (en CI siempre corren) |

- La CI requerida es `quality` (formato, lint, tipos) y `test` (pruebas y build); antes de abrir un PR, corre lo mismo en local.
- **El Worker del front solo se compila en Linux** (D129): los scripts `cf:*` de la web corren en CI, no en Windows.
- Los deploys a staging son automáticos al mezclar en `main` (`deploy-web.yml`, `deploy-api.yml`).
- En Windows, los comandos de `gh` con texto en español o JSON van en scripts de Node: PowerShell 5.1 altera comillas y acentos (D112).

## Pruebas obligatorias al tocar su área

- Aislamiento entre agencias (e2e): un usuario de una agencia pide un recurso de otra y recibe 404.
- Máquina de estados de galerías (unitarias).
- Bytes del ZIP (integración).
- Permisos del rol `app_api` y RLS (integración).
