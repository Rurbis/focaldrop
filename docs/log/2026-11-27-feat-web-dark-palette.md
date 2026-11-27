# feat(web): bring the logos' palette to the panel

PR: #113 · Autor: Rubén

## Decisiones

- **D-nueva · El panel toma la paleta de los logos: en oscuro, grafito frío, texto crema y cian; en claro, papel `#EFECE6`, tinta `#18181B` y el mismo cian más oscuro. La cianotipia de D135 deja de ser el acento** (precisa D135, D136 y D152).
  - **Por qué:** Rubén vio que el oscuro anterior, de marrones cálidos con un azul claro, se veía apagado y aburrido en las previews.
  - **La paleta**, con base en el logo oscuro (fondo `#121316`, crema `#EDE0D4`, cian `#06B6D4` y gris `#6C6560`):
    - papel `#121316`, superficie `#1A1C20`, elevado `#25282D`;
    - tinta `#EDE0D4`;
    - tinta secundaria `#B3A79B`: sale del crema y no de un gris genérico, porque el `#6C6560` del logo queda en 3.3:1 y no sirve para texto;
    - borde de campo `#7A736C`: el gris del logo aclarado lo justo para llegar a 3:1 sobre todas las superficies;
    - acento `#06B6D4`, con texto `#121316` encima (7.7:1), y acento suave `#0B3640`;
    - Mesa de luz: cuarto `#121316` y mesa `#1F2227`.
  - **El cian manda solo en las acciones,** los enlaces, el foco y la selección, no en la decoración (modo Operate).
  - **Modo claro**, con base en el logo claro: papel `#EFECE6`, elevado y cuarto `#E3DFD7`, tinta `#18181B`, borde de campo `#8A847C` (el gris del logo), acento `#066A7A` y acento suave `#DFF2F5`. Rubén pidió el mismo tono de cian que en oscuro, y no el `#2563EB` del logo claro (el azul de Tailwind que D135 había descartado). Pero `#06B6D4` queda en 2:1 sobre papel claro, así que en claro va el mismo tono (188°) más oscuro: 5.3:1 sobre el papel y 6.3:1 con texto blanco. El `Logo Claro.svg` local de Rubén se actualizó con ese cian.
  - **Lo que no cambia:** los colores de estado, la tipografía y el logo del sitio. El símbolo ya toma el acento del tema, así que su mitad derecha sale cian en oscuro.
  - **Contraste:** las 59 pruebas de `tokens.test.ts` pasan, todas AA en claro y en oscuro.

## Historial

- 2026-11-27: **Paleta oscura del logo → PR #113.**
  - `globals.css`: los valores oscuros de los tokens.
  - `admin/layout.tsx`: el `theme-color` oscuro.
  - `docs/design/brand.md`: la tabla de colores y de contraste.
  - **Capturas:** se regeneraron a propósito, en Docker, las 10 referencias: el login, el inicio y el muestrario, en claro y en oscuro.
  - **Hallazgo:** con la tolerancia por defecto de Playwright (`threshold` 0.2), un cambio sutil de color pasa como igual. El cambio del modo claro dejó intactas sus referencias hasta que se reescribieron con `--update-snapshots=all`, y lo mismo pasó con el inicio en oscuro.
  - **Skills:** impeccable, para la estrategia de color; frontend-ui-engineering, para tokens y contraste; break-ui, que no encontró qué estresar porque solo cambian colores y el acomodo es el mismo.

## Tiempo

- Paleta de los logos (R): sin estimado; real ≈ 1.25 h.

## Pendientes

- **Tolerancia de las capturas:** decidir si se baja el `threshold`, para que un cambio de color de la marca no pase sin aviso.
- **Logo nuevo:** el archivo del logo oscuro trae otro wordmark (en `system-ui`) y la etiqueta `[DUO/30D]`. Cambiarlo es otra decisión, con el texto convertido a trazos (D135).
