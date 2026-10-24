# docs(design): add the front-end design plan (d134)

Issue: — · PR: #50 · Autor: Rubén

Nota convertida de las filas que este PR agregaba a la bitácora (D138). Sus D# ya estaban reservadas porque otros documentos las citan.

## Decisiones

- **D134** · **Plan de diseño del front** (precisa B4, D24, D25, D39 y D85) — Acordado el 2026-10-20 tras cinco rondas de preguntas; detalle en [design/plan.md](../design/plan.md). Cubre el sitio público, la galería del cliente y el panel. Claude propone direcciones como **prototipos HTML navegables con las fotos reales** (sin Figma: el plan gratuito no da asiento de edición); Rubén y Fabian eligen; la agencia aprueba en 1 ronda sobre prototipos y 2 sobre el preview. Dirección **editorial cálido**; claro u oscuro por agencia con contraste verificado; catálogo curado de parejas tipográficas; la agencia personaliza tema y contenido, no el acomodo (D85); logo tipográfico provisional si no tiene marca; movimiento sutil. Galería con filas justificadas, visor con gestos y portada del evento. Panel neutro con la marca Focal Drop. Primitivas accesibles con estilo propio, sin el aspecto por defecto de shadcn/ui. **Barra obligatoria:** WCAG 2.2 AA, Core Web Vitals en verde en celular, checklist anti-genérico y capturas automáticas en CI. **Orden (2026-10-20): primero Focal Drop, después las agencias.** Bloque A: marca (logo refinado con wordmark en una sans libre, azul óptico propio porque `#2563EB` es el azul por defecto de Tailwind, personalidad "óptica + cuarto oscuro"), sistema de diseño y pantallas del panel, ahora y como **Should**: no bloquean la demo ni el cierre del hito 0 (#27), cuyo entregable sigue siendo login y panel que lee Nest, desplegados; al final, una página sencilla en focaldrop.com (backlog, Should). Bloque B: galería (hito 1) y sitio de la agencia (hito 2).

## Historial

- 2026-10-20: **D134, plan de diseño del front:** cinco rondas de preguntas definieron alcance, proceso, dirección (editorial cálido), temas por agencia, galería, panel, componentes y barra de calidad. Plan por partes con las skills de cada una en `docs/design/plan.md`.
