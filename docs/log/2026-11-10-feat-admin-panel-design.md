# feat(web): put the access pages and the panel on the light table

Issue: #53 · PR: #PENDIENTE · Autor: Rubén

## Decisiones

- **D-nueva · El panel usa el diseño "Mesa de luz", con su estructura separada para sumar otros diseños que cada persona elegirá después** (precisa D39, D134 y D136).
  - **Cómo se eligió:** con la A3 (#53) se presentaron tres estructuras sobre la misma marca: Mesa de luz, Sobre de laboratorio y Agenda de entregas. Las tres están en [`design/panel-propuestas.html`](../design/panel-propuestas.html), con datos de demostración. Una revisión independiente las dejó al mismo nivel antes de compararlas.
  - **La decisión:** Rubén y Fabian decidieron conservar las tres. Cada persona elegirá el diseño de su panel; quien no elija verá Mesa de luz. El selector, B y C son una idea para el hito 4+ (#90): se construyen cuando haya datos de uso.
  - **Por qué:**
    - para vender la plataforma como personalizable;
    - porque las agencias trabajan distinto (muchas galerías frente a eventos con fecha), y los tres diseños organizan el trabajo de forma distinta.
  - **Dónde se guardará:** en el perfil de cada persona, en la BD, no en el navegador. Si está vacío, se usa Mesa de luz.
  - **Lo que se prepara ahora:** la estructura (marco y navegación) vive en `features/panel/light-table/`, separada de los datos (`getAdminHome`) y de las secciones del panel (`features/panel/nav.ts`), que comparten todos los diseños.
  - **Costo aceptado:**
    - con el selector, cada pantalla nueva del panel se compone, se prueba y se captura en cada diseño;
    - el Worker crece, y Workers Paid podría hacer falta antes;
    - la ayuda cambia según el diseño.
- **D-nueva · El panel sigue el modo claro u oscuro del sistema** (cumple lo previsto en D136).
  - La raíz pasa a `color-scheme: light dark`.
  - Tokens nuevos de Mesa de luz: `room` (el cuarto), `table` (la mesa iluminada), y `table-raised` y `table-line` (rellenos y líneas sobre la mesa). Todos usan valores de la paleta de D135.
  - La prueba de contraste suma 10 pares, todos AA en claro y en oscuro.
  - La barra del navegador del celular toma el tono del cuarto (`theme-color`).

## Historial

- 2026-11-10: **A3 (#53) → PR: Mesa de luz.**
  - **Login y recuperación:** van sobre la mesa iluminada. El login nombra la agencia del dominio; ese texto llega aparte, así que el formulario funciona aunque la API tarde o falle.
  - **Panel:** una barra con logo, secciones, agencia y «Salir», y un enlace para saltar al contenido.
  - **Inicio:** saluda por el primer nombre y muestra «Lo que sigue».
  - **Estados:** cargando, error temporal y sin acceso. En el error y en el 403, la barra no nombra la agencia.
  - **Formularios:** usan los componentes de la A2; sale `components/ui/form.tsx`, con sus grises `neutral-*`.
  - **Una sola petición:** `getAdminHome` usa `cache()` de React, así que el marco y la página comparten una petición a Nest. Con la API caída quedó un solo registro.
  - **Textos corregidos:**
    - el 403 ya no promete invitaciones, que no existen en el MVP;
    - el error dice «No pudimos cargar tu inicio».
  - **Probado en local** con Supabase en puertos alternos: claro, oscuro, celular (320 y 375 px), credenciales incorrectas, error temporal, 403, salir, teclado y enlace de salto.
  - **Datos extremos (break-ui):** con nombres de 86 y 117 caracteres y una agencia sin espacios aparecieron dos problemas. Se corrigieron así:
    - el login ya no tiene scroll horizontal;
    - el saludo usa el primer nombre, porque con el nombre completo llegaba a 6 líneas y el plan §4 permite 2.
  - **Pruebas nuevas:** contraste de tokens, sección actual, texto del login y primer nombre. Al romper a propósito cada regla, falla una prueba.

## Tiempo

- #53 A3 (R): sin estimado; real ≈ 5 h asistidas (tres propuestas y su revisión, implementación, pruebas y datos extremos).

## Pendientes

- **Aprobación:** Rubén la aprueba en la preview, en la computadora y en el celular; Fabian revisa el código.
- **Hito 1:** Galerías y Clientes se suman a `panelSections`. En el celular, con más de una sección, hace falta el menú (en el prototipo, la hoja de Mesa de luz).
- **Doble envío:** dos Enter seguidos en el login hacen dos envíos. El botón pendiente de React Aria no bloquea el envío implícito del formulario. Es inofensivo al entrar.
- **Capturas automáticas** de estas pantallas con Playwright: A2, parte 2 (#52).
- **`PRODUCT.md`** (contexto para la skill impeccable) sigue local, sin versionar: decidir si entra al repo.
