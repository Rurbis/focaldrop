# feat(web): add the design system tokens, components and showcase (d136)

Issue: #52 · PR: #56 · Autor: Rubén

Nota convertida de las filas que este PR agregaba a la bitácora (D138). Sus D# ya estaban reservadas porque otros documentos las citan.

## Decisiones

- **D136** · **Sistema de diseño del panel: tokens propios sobre React Aria Components** (precisa D134 y D135) — Base visual de todo lo de Focal Drop (#52, parte A2 del plan de diseño). **Tokens:** variables semánticas en `globals.css` (papel, superficie, tinta, acento, peligro, éxito, aviso…), cada una con su valor claro y oscuro; Tailwind las expone como utilidades (`bg-paper`, `text-ink`), así que los componentes nunca nombran un modo. Cinco tamaños de texto, un solo radio e Instrument Sans servida con `next/font` (el navegador no hace peticiones a Google). Una prueba lee los tokens reales y falla si algún par de colores baja de WCAG 2.2 AA (4.5:1 en texto, 3:1 en bordes de campos), en claro y en oscuro. **Componentes:** botón, campo de texto, mensaje, etiqueta de estado, menú, diálogo de confirmación y tabla, sobre **React Aria Components 1.21.1** (Adobe, Apache-2.0). Resuelve teclado, foco y roles de accesibilidad sin imponer estilos, así que el aspecto es propio y no el de shadcn por defecto; frente a Radix, trae además tabla y campos de fecha (útiles para vencimientos). **Muestrario:** `/admin/ui`, solo en desarrollo (en producción responde 404), con cada componente en claro y oscuro y datos al extremo. **Modo oscuro:** el panel sigue en claro hasta que sus pantallas usen estos tokens (A3, #53); entonces seguirá al sistema. Las capturas de Playwright en CI van en un segundo PR.

## Historial

- 2026-10-22: **#52 → PR: sistema de diseño (D136).** Tokens de color, texto y forma con prueba de contraste; siete componentes sobre React Aria Components y el muestrario `/admin/ui` en claro y oscuro, solo en desarrollo. Las capturas de Playwright en CI quedan para un segundo PR.
