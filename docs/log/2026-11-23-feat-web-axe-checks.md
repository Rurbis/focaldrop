# test(web): check the key pages against wcag 2.2 with axe

PR: #106 · Autor: Rubén

## Decisiones

- **D-nueva · Las páginas de las capturas se revisan con axe contra WCAG 2.2 A y AA, en claro y oscuro y en las dos anchuras** (precisa D134 y la D-nueva del #104). Es lo que el plan de diseño (§7) pedía para las capturas: "con axe".
  - **Qué:** `apps/web/e2e/accessibility.spec.ts`, con `@axe-core/playwright`. Revisa las mismas páginas y proyectos que las capturas: la página pública y `/admin/login` en los cuatro proyectos, y el muestrario en los dos claros, porque ya pinta los dos modos. Son 10 revisiones.
  - **Etiquetas:** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`. La [guía de Playwright](https://playwright.dev/docs/accessibility-testing#scanning-for-wcag-violations) solo usa las cuatro primeras; se suma `wcag22aa` porque el plan fija WCAG 2.2. En axe 4.14 la única regla de 2.2 es `target-size`, que axe trae apagada por defecto; `withTags` la enciende (comprobado).
  - **Falla con cualquier violación de esas reglas**, no solo con las críticas o graves. El plan fija WCAG 2.2 AA, y una regla con etiqueta WCAG marca un incumplimiento, no una recomendación. Las reglas de buenas prácticas de axe quedan fuera.
  - **Guarda:** la prueba exige que `color-contrast` y `target-size` hayan corrido. Así, una configuración que las apague no puede pasar en verde.
  - **Solo se excluye** el indicador de desarrollo de Next (`nextjs-portal`), que no es parte del producto.
  - **Lo que axe deja "por revisar" no falla la prueba.** Hoy son dos casos, los dos en el muestrario:
    - un campo sin descripción ni error, cuyo `aria-describedby` apunta a dos IDs que no existen. React Aria (`useSlotId`) los pone en el render del servidor y los quita después de hidratar, si los elementos no existen. Es inofensivo: los lectores de pantalla ignoran referencias inexistentes;
    - la tabla de muestra "Galerías vacías" (`th-has-data-cells`): es el estado vacío a propósito.
  - **Dónde corre:** en el job `visual`, que tampoco es requerido hasta la B2, igual que las capturas.
  - **Por qué con Playwright y no contra la preview** (`@axe-core/cli`): reutiliza el entorno del #104 (agencia ficticia, Linux, los dos modos y las dos anchuras) y da el mismo resultado en local y en la CI.

## Historial

- 2026-11-23: **Accesibilidad con axe → PR #106**, apilado sobre el #104.
  - `@axe-core/playwright` 4.14.0, publicado el 2026-10-15 (D131). Pide `axe-core ~4.14.0`, y la 4.14.1 solo tenía 7 días, así que se instaló con la regla del #105 (`--config.minimumReleaseAge=20160`). El lockfile solo agrega `@axe-core/playwright` 4.14.0 y `axe-core` 4.14.0.
  - **Resultado:** las 10 revisiones pasan sin violaciones, en unos 10 s más la instalación.
  - **Mutaciones**, cada una en Docker y revertida después:
    - texto secundario con poco contraste solo en claro: fallan las 6 revisiones claras;
    - el mismo problema solo en oscuro: fallan las 4 oscuras y el muestrario, que también pinta el modo oscuro;
    - un campo sin su etiqueta: fallan el login y el muestrario (`label`);
    - botones de 12 px: falla el muestrario (`target-size`).

## Tiempo

- Accesibilidad con axe (R): sin estimado; real ≈ 1.5 h asistidas.

## Pendientes

- **Volverlo check requerido** con la B2, junto con las capturas.
- **Lo manual sigue:** teclado, lector de pantalla y foco visible (plan §7). axe no los cubre.
- **Más páginas:** el panel con sesión y la galería, cuando haya una sesión sintética para las pruebas.
- **Al mezclar el #104:** cambiar la base de este PR a `main` y rebasarlo sobre el commit del #104.
