# Notas de bitácora por PR

Cada PR deja **su propia nota** en esta carpeta en lugar de editar [la bitácora](../project-log.md) (D138). Dos PRs nunca escriben en el mismo archivo, así que la bitácora deja de provocar conflictos al mezclar, y con ellos las re-aprobaciones que exigía la regla de `main` (D113).

## Cómo escribir la nota

- **Nombre:** `AAAA-MM-DD-<rama>.md`, con la fecha en que se abre el PR. Por ejemplo, `2026-10-23-feat-tenant-resolution.md`.
- **Contenido:** solo las secciones que apliquen, en este orden:

```markdown
# <título del PR>

Issue: #N · PR: #M · Autor: <nombre>

## Decisiones
- **D-nueva · <título>** (precisa D#) — <la decisión y su porqué, como una fila de la bitácora §5>.

## Historial
<una línea para la bitácora §11: qué cambió y por qué importa>

## Tiempo
<estimado frente a real, para la bitácora §10>

## Pendientes
<lo que queda para después, para la bitácora §7>
```

- **Las decisiones nuevas no llevan número.** Se escriben como "D-nueva". El número lo asigna quien integra, para que dos PRs nunca reclamen la misma D#. La excepción: si el PR necesita citar su decisión en otro documento, reserva el siguiente número libre (revisando los PRs abiertos) y lo usa en la nota.
- La nota se revisa como el resto del PR.

## Cómo se integra

Una vez por semana, después de la llamada semanal, **Rubén** abre un PR `docs(log): integrate the week's notes` que:

1. pasa cada nota a su sección de la bitácora y numera las decisiones nuevas;
2. borra las notas integradas;
3. actualiza el encabezado de estado de la bitácora.

Ese PR lo revisa Fabian como cualquier otro.
