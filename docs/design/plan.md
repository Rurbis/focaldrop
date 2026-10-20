# Plan de diseño del front

> Acordado el 2026-10-20 (D134). Cómo se diseñan el sitio público, la galería del cliente y el panel sin que se vean genéricos ni "hechos con IA". Precisa B4, D24, D25, D39 y D85; no cambia el alcance de ningún hito (D92).

## 1. El reto

No diseñamos **un** sitio: diseñamos **una plantilla** que cada agencia viste con su tema. Las plantillas tienden a verse genéricas, así que esta necesita carácter propio y, a la vez, adaptarse a la marca de cada agencia. La primera agencia hace bodas y XV años, eventos, retrato y producto; atiende a un cliente medio, todavía no tiene identidad visual y habla en un tono cálido. Para el moodboard eligió dos sitios cuya foto manda a gran tamaño (§6).

## 2. Decisiones

| Tema                | Decisión                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superficies         | Sitio público (hito 2), galería del cliente (hito 1) y panel (hitos 0–1). Cada una con sus reglas (§3).                                                  |
| Quién diseña        | Claude propone direcciones; Rubén y Fabian eligen; la agencia aprueba (D24).                                                                             |
| Prototipos          | HTML navegable, compartido por enlace, con las fotos reales de la agencia. Sin Figma: el plan gratuito no da asiento de edición.                         |
| Rondas con la agencia | 1 sobre prototipos para elegir dirección y 2 sobre el preview de staging. Cada pedido de cambio es un issue `design-feedback` (D24).                   |
| Marca de la plataforma | Todo lo que ve el cliente es de la agencia; solo un "Hecho con Focal Drop" discreto en el pie.                                                       |
| Dirección del sitio | **Editorial cálido**: la foto manda, mucho aire, letra elegante, tonos cálidos.                                                                          |
| Claro u oscuro      | La plantilla funciona en los dos; cada agencia elige en su tema, con contraste verificado automáticamente.                                               |
| Tipografía          | Catálogo curado de 5 a 8 parejas (títulos y texto), libres de licencia, cargadas con `next/font` (B4). Ninguna de las típicas de plantilla.              |
| Personalización v1  | Colores, pareja tipográfica, logo, claro/oscuro, textos e imágenes de cada sección. El acomodo es fijo y cuidado (D85).                                   |
| Sin logo            | Si la agencia no tiene logo, el tema genera uno tipográfico con su nombre y la fuente de títulos elegida.                                                |
| Movimiento          | Sutil y con propósito: carga de fotos, visor y cambio de página. Respeta "reducir movimiento" y nunca retrasa ver las fotos.                              |
| Galería             | Filas justificadas (cada foto con su proporción, sin recortes), visor a pantalla completa con gestos y portada del evento con "Descargar todo" a mano.     |
| Panel               | Neutro con la marca Focal Drop (sus logos, el azul óptico como acento), en claro y oscuro (D39).                                                         |
| Componentes         | Primitivas accesibles sin estilo (Radix o React Aria, se decide en la parte 2) y estilo 100 % propio. Nada del aspecto por defecto de shadcn/ui.          |

## 3. Las tres superficies

- **Sitio público.** La vitrina de la agencia y donde más se nota lo genérico. Cada sección responde a una pregunta del visitante: qué hacen, cómo se ve su trabajo (por tipo de evento), cuánto cuesta, quiénes son y cómo contactarlos (D25).
- **Galería del cliente.** Lo más importante para la agencia: ver, elegir y descargar, casi siempre en celular. Usa el tema de la agencia, pero la interfaz se aparta para dejar las fotos al frente.
- **Panel.** Una herramienta de trabajo: clara, densa cuando hace falta y predecible. Usa la marca de Focal Drop, no la de la agencia (D39).

## 4. Checklist anti-genérico

Se revisa en cada PR que toque interfaz. **Señales de "hecho con IA" que no deben aparecer:**

- Degradados morado-azul, vidrio esmerilado o brillos sin razón de ser.
- Portada centrada con un titular de relleno ("Capturamos tus momentos más especiales") y dos botones.
- La estructura de landing de software trasplantada: fila de tres íconos con título y párrafo, carrusel de testimonios y tres planes con el del centro resaltado.
- Tarjetas dentro de tarjetas, sombras grandes en todo y el mismo radio en cada esquina.
- Fotos de stock o generadas, emojis como íconos, *lorem ipsum* o frases como "solución integral".
- Una sola fuente de sistema para todo, o tamaños sin jerarquía clara.
- Animación de entrada en cada bloque al hacer scroll.
- Una paleta que no tiene nada que ver con las fotos.

**Lo que sí:**

- Las fotos reales de la agencia **son** el diseño: composición editorial con tamaños y ritmos variados en el sitio; proporción intacta en la galería.
- Jerarquía tipográfica con contraste fuerte entre títulos y texto, de la pareja elegida.
- Textos específicos en la voz de la agencia (tipos de evento, lugares, procesos), en español de México.
- Espacios con ritmo y asimetría intencional, no bloques iguales apilados.
- Detalles que se notan sin verse: carga de fotos con su color dominante, foco visible, estados vacíos y de error escritos para personas.

## 5. Plan por partes

| Parte | Cuándo | Qué | Skills |
| ----- | ------ | --- | ------ |
| **0 · Fundamentos** | Ahora | Este documento, D134 y la barra de calidad (§7). | `constraint-driven-development`, `documentation-and-adrs` |
| **1 · Investigación y moodboard** | Ahora | Análisis de los dos sitios elegidos (§6): composición, tipografía, ritmo; qué tomar y qué no. Pedir a la agencia qué le gustó y sus JPG reales. | `taste-skill`, navegador integrado |
| **2 · Sistema de diseño y panel** | Inicio del hito 1 | Tokens (escala tipográfica, espacios, colores semánticos, claro/oscuro en Tailwind v4), primitivas accesibles y componentes propios; identidad del panel. | `impeccable`, `frontend-ui-engineering`, `emil-design-eng`, `source-driven-development`, `break-ui`, `web-design-guidelines` |
| **3 · Galería del cliente** | Hito 1 | Prototipo con fotos reales y luego la implementación: filas justificadas, visor con gestos, portada, selección y descarga. | `apple-design`, `animate`, `animation-performance`, `performance-optimization`, `break-ui`, `web-design-guidelines` |
| **4 · Dirección de arte del sitio** | Inicio del hito 2 | 3 variantes del editorial cálido como prototipos, cada una en claro y oscuro y con 2 parejas tipográficas; la agencia elige. Catálogo de parejas y generador de tema con verificación de contraste. | `taste-skill`, `frontend-design`, `artifact-design`; `ui-ux-pro-max` solo como consulta |
| **5 · Construcción del sitio** | Hito 2 | Secciones de D25 con el tema por tokens y su edición en el panel; 2 rondas sobre el preview. | `taste-skill`, `impeccable`, `find-animation-opportunities`, `animate`, `performance-optimization`, `web-design-guidelines`, `break-ui` |
| **6 · Calidad continua** | Siempre | Checklist en la plantilla de PR, capturas automáticas en CI y presupuestos de rendimiento. | `constraint-driven-development`, `web-design-guidelines`, `break-ui`, `code-review` |

**Skills que no se usan aquí:** `soft-skill`, `minimalist-skill` y `brutalist-skill` imponen un estilo prefabricado; `image-to-code-skill` está pensada para otro agente; `huashu-design` duplica a `taste-skill`; `redesign-skill` es para sitios existentes; las de Figma requieren un asiento de edición.

## 6. Referencias de la agencia

Eligió 2 de los 5 sitios propuestos; descartó el estilo revista con tonos tierra, el minimalista blanco y el romántico en crema.

- **elizabethmessina.com:** fotos grandes que van pasando una por una, letra elegante.
- **jonaspeterson.com:** cinematográfico, foto a pantalla completa con el texto encima.

El análisis de la parte 1 se agrega aquí. Las capturas de esos sitios no se guardan en el repo: son obra de otros.

## 7. Barra de calidad

Obligatoria antes de mezclar un PR de interfaz:

1. **Accesibilidad WCAG 2.2 AA:** contraste (también en los temas de cada agencia), teclado, lectores de pantalla y foco visible.
2. **Rendimiento en celular:** Core Web Vitals en verde en un celular medio, LCP ≤ 2.5 s, CLS ≤ 0.1 e INP ≤ 200 ms.
3. **Checklist anti-genérico** (§4), revisada con las skills de crítica.
4. **Capturas automáticas en CI:** Playwright compara capturas de las páginas clave y avisa si algo cambió sin querer. Las referencias se actualizan solo a propósito.

## 8. Decisiones pendientes

- Radix o React Aria para las primitivas (parte 2).
- Biblioteca o código propio para las filas justificadas y el visor con gestos (parte 3).
- Las parejas tipográficas del catálogo (parte 4).
- El nombre y la marca definitivos de la agencia, cuando los tenga.
