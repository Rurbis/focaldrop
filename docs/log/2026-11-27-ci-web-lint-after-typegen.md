# ci: lint the web after next typegen

PR: #111 · Autor: Rubén

## Historial

- 2026-11-27: **El lint de la web espera a `next typegen` → PR #111.**
  - **Qué pasaba:** el tipo global `PageProps` que usa `login/page.tsx` lo genera `next typegen`, que corre dentro del `typecheck` de la web. Turbo corría `lint` y `typecheck` en paralelo. Si ESLint llegaba antes que los tipos, `PageProps` era un tipo de error y fallaba `no-unsafe-assignment`.
  - **Dónde salió:** en el job `quality` del Dependabot #108. Se reprodujo igual en un worktree limpio de `main`, así que no lo causa ninguna dependencia. En `main` pasaba por suerte de tiempos.
  - **El arreglo**, solo en `turbo.json`:
    - el `lint` de la web depende de su `typecheck`;
    - el `typecheck` de la web declara como `outputs` lo que genera `next typegen` (`.next/types/**` y `next-env.d.ts`). Sin eso, un `typecheck` sacado de la caché no restaura los tipos y el lint vuelve a fallar. Le pasaría al #108 al reintentarlo: Turbo guarda el `typecheck` que salió bien, pero no el `lint` que falló.
  - **Probado:**
    - en un worktree limpio, `turbo run lint` de la web falla antes del cambio y pasa después, porque ahora corre primero el `typecheck`;
    - con el `typecheck` en la caché y `.next` borrado, el lint pasa porque la caché restaura los tipos;
    - formato, tipos, lint, pruebas, build y las pruebas de `scripts/`.
  - **Costo:** en la CI, el lint de la web arranca unos 10 s después, cuando termina su `typecheck`.

## Tiempo

- Diagnóstico y arreglo (R): sin estimado; real ≈ 0.5 h.
