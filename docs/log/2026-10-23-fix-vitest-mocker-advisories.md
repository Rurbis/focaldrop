# fix(deps): bump vitest to 4.1.12 for the mocker advisories

Issue: — · PR: (este) · Autor: Rubén

## Historial

- 2026-10-23: **Alertas de Dependabot #19 y #20 → PR:** Vitest 4.1.11 → 4.1.12 en la API, la web y `shared`, junto con `@vitest/coverage-v8` en la API. `@vitest/mocker` 4.1.11 tenía dos avisos de severidad media, publicados el 2026-10-21:
  - [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8): el WebSocket del servidor de desarrollo de Vite acepta registros de *mocks* sin autenticación y permite inyectar código;
  - [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp): en Windows, una diagonal invertida se salta el arreglo anterior contra el recorrido de rutas.

  El riesgo real era bajo: Vitest es dependencia de desarrollo, y los dos avisos atacan el servidor que usa el modo navegador de Vitest, mientras que aquí las pruebas corren en Node. La 4.1.12 tiene 8 días publicada y entra por la excepción de seguridad de D131. Se sigue en la línea 4.1 de D120: la 5 espera a `@cloudflare/vitest-pool-workers`.

## Tiempo

≈ 0.3 h.
