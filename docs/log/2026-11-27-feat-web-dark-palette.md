# feat(web): bring the dark logo's palette to the dark mode

PR: #113 · Autor: Rubén

## Decisiones

- **D-nueva · El modo oscuro del panel toma la paleta del logo oscuro: grafito frío, texto crema y acento cian** (precisa D135, D136 y D152).
  - **Por qué:** Rubén vio que el oscuro anterior, de marrones cálidos con un azul claro, se veía apagado y aburrido en las previews.
  - **La paleta**, con base en el logo oscuro (fondo `#121316`, crema `#EDE0D4`, cian `#06B6D4` y gris `#6C6560`):
    - papel `#121316`, superficie `#1A1C20`, elevado `#25282D`;
    - tinta `#EDE0D4`;
    - tinta secundaria `#B3A79B`: sale del crema y no de un gris genérico, porque el `#6C6560` del logo queda en 3.3:1 y no sirve para texto;
    - borde de campo `#7A736C`: el gris del logo aclarado lo justo para llegar a 3:1 sobre todas las superficies;
    - acento `#06B6D4`, con texto `#121316` encima (7.7:1), y acento suave `#0B3640`;
    - Mesa de luz: cuarto `#121316` y mesa `#1F2227`.
  - **El cian manda solo en las acciones,** los enlaces, el foco y la selección, no en la decoración (modo Operate).
  - **Lo que no cambia:** el modo claro (se ajusta después con el logo claro), los colores de estado, la tipografía y el logo. El símbolo ya toma el acento del tema, así que su mitad derecha sale cian en oscuro.
  - **Contraste:** las 59 pruebas de `tokens.test.ts` pasan, todas AA en claro y en oscuro.

## Historial

- 2026-11-27: **Paleta oscura del logo → PR #113.**
  - `globals.css`: los valores oscuros de los tokens.
  - `admin/layout.tsx`: el `theme-color` oscuro.
  - `docs/design/brand.md`: la tabla de colores y de contraste.
  - **Capturas:** se regeneraron a propósito las 4 referencias que cambian, en Docker: el login oscuro en escritorio y celular, y el muestrario, que también pinta el modo oscuro. La página pública no cambió.
  - **Skills:** impeccable, para la estrategia de color; frontend-ui-engineering, para tokens y contraste; break-ui, que no encontró qué estresar porque solo cambian colores y el acomodo es el mismo.

## Tiempo

- Paleta oscura (R): sin estimado; real ≈ 0.75 h.

## Pendientes

- **Modo claro con el logo claro:** cuando Rubén lo comparta.
- **Logo nuevo:** el archivo del logo oscuro trae otro wordmark (en `system-ui`) y la etiqueta `[DUO/30D]`. Cambiarlo es otra decisión, con el texto convertido a trazos (D135).
