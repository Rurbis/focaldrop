# feat(web): bring the logos' palette to the panel

PR: #113 · Autor: Rubén

## Decisiones

- **D-nueva · El panel toma la paleta de los logos: en oscuro, grafito frío, texto crema y cian; en claro, papel `#EFECE6`, tinta `#18181B` y el mismo cian, que ahí solo rellena. La cianotipia de D135 deja de ser el acento** (precisa D135, D136 y D152).
  - **Por qué:** Rubén vio que el oscuro anterior, de marrones cálidos con un azul claro, se veía apagado y aburrido en las previews.
  - **La paleta**, con base en el logo oscuro (fondo `#121316`, crema `#EDE0D4`, cian `#06B6D4` y gris `#6C6560`):
    - papel `#121316`, superficie `#1A1C20`, elevado `#25282D`;
    - tinta `#EDE0D4`;
    - tinta secundaria `#B3A79B`: sale del crema y no de un gris genérico, porque el `#6C6560` del logo queda en 3.3:1 y no sirve para texto;
    - borde de campo `#7A736C`: el gris del logo aclarado lo justo para llegar a 3:1 sobre todas las superficies;
    - acento `#06B6D4`, con texto `#121316` encima (7.7:1), y acento suave `#0B3640`;
    - Mesa de luz: cuarto `#121316` y mesa `#1F2227`.
  - **El cian manda solo en las acciones,** los enlaces, el foco y la selección, no en la decoración (modo Operate).
  - **Modo claro**, con base en el logo claro: papel `#EFECE6`, elevado y cuarto `#E3DFD7`, tinta `#18181B`, borde de campo `#8A847C` (el gris del logo) y el mismo cian `#06B6D4`. Rubén pidió el cian del modo oscuro, y no el `#2563EB` del logo claro (el azul de Tailwind que D135 había descartado).
  - **En claro el cian solo rellena,** porque queda en 2.1:1 sobre el papel. Un primer intento con el mismo tono oscurecido (`#066A7A`) pasaba AA en todo, pero Rubén lo vio como otro azul y eligió el cian exacto donde se ve:
    - el botón principal, con texto `#18181B` encima (7.3:1);
    - el símbolo, la selección y el subrayado de los enlaces y de la sección actual;
    - un token nuevo, `accent-ink`, es el acento como texto: tinta en claro y el cian en oscuro. Lo usan los enlaces, la etiqueta "Publicada" y los mensajes informativos;
    - el foco enmarca el anillo cian en `on-accent`, 2 px por dentro y 1 px por fuera. En claro el marco oscuro da el 3:1 que el cian no alcanza, y en oscuro se pierde en el fondo. Los elementos con `outline-none` quedan fuera, y el menú dibuja su anillo por dentro;
    - acento suave `#CDEFF5`, un poco más cian para que la etiqueta se lea en el color.

    El `Logo Claro.svg` local de Rubén lleva el mismo `#06B6D4`.
  - **En oscuro cambia poco:** la selección pasa a cian con texto oscuro y el subrayado de los enlaces a 2 px.
  - **Lo que no cambia:** los colores de estado, la tipografía y el logo del sitio. El símbolo ya toma el acento del tema, así que su mitad derecha sale cian en oscuro.
  - **Contraste:** las 73 pruebas de `tokens.test.ts` pasan, todas AA en claro y en oscuro. El acento como texto se prueba con `accent-ink`. El foco se prueba como anillo de dos colores: uno de los dos llega a 3:1 sobre cada fondo, y el marco separa al cian.

## Historial

- 2026-11-27: **Paleta oscura del logo → PR #113.**
  - `globals.css`: los valores oscuros de los tokens.
  - `admin/layout.tsx`: el `theme-color` oscuro.
  - `docs/design/brand.md`: la tabla de colores y de contraste.
  - **Capturas:** se regeneraron a propósito, en Docker, las 10 referencias: el login, el inicio y el muestrario, en claro y en oscuro.
  - **Hallazgo:** con la tolerancia por defecto de Playwright (`threshold` 0.2), un cambio sutil de color pasa como igual. El cambio del modo claro dejó intactas sus referencias hasta que se reescribieron con `--update-snapshots=all`, y lo mismo pasó con el inicio en oscuro.
  - **Skills:** impeccable, para la estrategia de color; frontend-ui-engineering, para tokens y contraste; break-ui, que no encontró qué estresar porque solo cambian colores y el acomodo es el mismo.
- 2026-11-27: **El cian exacto en claro.**
  - Rubén vio en la preview el `#066A7A` como otro azul y eligió el `#06B6D4` donde se ve.
  - `globals.css`: el acento, `on-accent`, el nuevo `accent-ink`, la selección, el cursor y el marco del foco.
  - Componentes: el enlace, la etiqueta, el mensaje y el anillo del menú.
  - `tokens.test.ts` y `docs/design/brand.md`.
  - **Capturas:** se regeneraron otra vez las 10 referencias.
  - **Mutación:** con texto blanco en el botón y el cian como texto, fallan 14 pruebas de contraste.

## Tiempo

- Paleta de los logos (R): sin estimado; real ≈ 1.75 h.

## Pendientes

- **Tolerancia de las capturas:** decidir si se baja el `threshold`, para que un cambio de color de la marca no pase sin aviso.
- **Logo nuevo:** el archivo del logo oscuro trae otro wordmark (en `system-ui`) y la etiqueta `[DUO/30D]`. Cambiarlo es otra decisión, con el texto convertido a trazos (D135).
