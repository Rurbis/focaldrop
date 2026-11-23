# fix(web): serve the icons as static files

PR: #103 · Autor: Rubén

## Decisiones

- **D-nueva · Los íconos del sitio son archivos estáticos en `apps/web/public/`, no rutas de Next** (precisa D135 y D137). En `src/app/`, `icon.svg` y `apple-icon.png` eran rutas de metadatos que el Worker ejecutaba en cada petición, y `/favicon.ico` no existía, así que Next respondía un 404 desde el Worker. En staging, `icon.svg` gastó 57 ms de CPU y cada `/favicon.ico`, de 18 a 54 ms (medición del 2026-11-23 en el #82). En `public/`, Workers Static Assets los sirve sin ejecutar el Worker. Se declaran a mano en `src/app/layout.tsx`. **`favicon.ico` nuevo:** el mismo símbolo de `icon.svg` en 16, 32 y 48 px, sobre un cuadro papel redondeado como el ícono de iOS. Es para los navegadores que no leen SVG. Un ICO no sigue el tema del navegador, y sin fondo la mitad en tinta se perdería en una pestaña oscura. Chrome, Edge y Firefox siguen usando `icon.svg`, que sí cambia con el tema. `apple-icon.png` pasa a llamarse `apple-touch-icon.png`, el nombre que iOS pide por defecto.

## Historial

- 2026-11-23: **Íconos fuera del Worker → PR #103.** `icon.svg` y `apple-touch-icon.png` se mueven a `public/`, y `favicon.ico` se dibuja con Pillow a partir de las dos mitades de `icon.svg` (mismos colores y proporciones, en 16, 32 y 48 px). `docs/design/brand.md` lo documenta. Las páginas compiladas declaran los tres `<link>` y ya no hay rutas de íconos en `.next/server/app`. Lint, tipos, 183 pruebas de la web y build correctos.

## Tiempo

- Íconos estáticos (R): sin estimado; real ≈ 0.5 h, con la revisión de los logs.
