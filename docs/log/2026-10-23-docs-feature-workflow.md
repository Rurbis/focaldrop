# docs: work by vertical features and log notes per pull request

Issue: — · PR: (este) · Autor: Rubén

## Decisiones

- **D138 · Trabajo por features verticales, con un tablero del que cada quien toma** (cambia D99; precisa D100, D108 y D113). Acordada por Rubén y Fabian el 2026-10-23. El número está reservado porque la Fase 2 ya lo cita (D136 es del #56 y D137 del #59).
  - **Qué es una feature:** cada issue es una feature completa (BD, API, web, pruebas y documentación) que hace una sola persona. Aplica desde ya: las issues pendientes del hito 0 se re-cortan (Fase 2 §9.1) y el hito 1 se planea así.
  - **Nadie tiene dueño fijo** por capa ni por persona. La columna "Hito actual" del tablero va ordenada por prioridad. Al terminar algo, cada quien toma la de más arriba que nadie tenga: se la asigna y la mueve a "En curso" **antes** de empezar. Puede preferir una de un área que conozca, siempre que no se brinque una urgente.
  - **Una feature en curso por persona**, más las revisiones del otro. Solo se toma una segunda si la primera está bloqueada.
  - **Tamaño:** máximo unos 2 días. Si es más grande, se parte en rebanadas que funcionan de punta a punta.
  - **Piezas compartidas** (esquema de BD, `@focaldrop/shared`, layouts del panel): se avisa al tomarlas. Si los dos cambian el esquema, quien mezcla segundo actualiza su rama y regenera su migración.
  - **Revisión:** siempre en local, en un máximo de 24 h hábiles, y antes de empezar una feature nueva. El autor mezcla después de la aprobación.
  - **Coordinación:** el tablero manda. Al tomar o terminar una feature, un mensaje corto al otro. Llamada semanal de 30 minutos.
  - **Bitácora:** cada PR deja una nota en `docs/log/` en lugar de editarla, y Rubén las integra cada semana ([docs/log/README.md](README.md)). La regla de `main` que borra aprobaciones con cada push (D113) no cambia.

  **Por qué:**
  - El reparto por capas de D99 hacía que uno esperara al otro: el login de la web esperaba el `auth` de la API, y el panel esperaba el `tenancy`.
  - Cada PR editaba la bitácora en las mismas líneas. Mezclar uno obligaba a actualizar los demás, y cada actualización costaba una re-aprobación: el 2026-10-23 fueron seis PRs en cadena.
  - Con features verticales, cada quien entiende el sistema completo, que era el objetivo de la rotación que D99 dejaba para el hito 2.

## Historial

**D138 → PR:** trabajo por features verticales con un tablero del que cada quien toma, y notas de bitácora por PR. Se re-cortan las issues pendientes del hito 0 (Fase 2 §9.1); el tablero se ajusta al aprobarse.

## Tiempo

≈ 1 h, entre la plática de preguntas y la propuesta.

## Pendientes

Al aprobarse, Rubén aplica el re-corte en GitHub (Fase 2 §9.1, "Cambios en el tablero").
