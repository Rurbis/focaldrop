# Plan de diseño del front

> Acordado el 2026-10-20 (D134). Cómo se diseñan el sitio público, la galería del cliente y el panel sin que se vean genéricos ni "hechos con IA". Precisa B4, D24, D25, D39 y D85; no cambia el alcance de ningún hito (D92).
>
> **Alcance del hito 0 (sin cambios):** login y un panel que lee datos de Nest, desplegados (Parte C §2). El bloque A es **Should**: se trabaja mientras el dueño del repo espera las issues de la API, pero la demo y el cierre del hito 0 (#27) **no dependen** de A1, A2 ni A3. Si no están listas, la demo usa el panel tal como esté.

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

- **Sitio público.** La vitrina de la agencia y donde más se nota lo genérico. Cada sección responde a una pregunta del visitante: qué hacen, cómo se ve su trabajo (por tipo de evento), cuánto cuesta, quiénes son y cómo contactarlos (D25). Para el MVP, las secciones Must son las de la Parte C §3.5: portada, portafolio por categoría, paquetes, contacto y aviso de privacidad. "Sobre nosotros", testimonios y FAQ son Should del hito 4.
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
- Etiquetas diminutas en mayúsculas espaciadas, o un "antetítulo" encima de cada título.
- Rayas finas para separar secciones, contornos de 1 px y sombras en cosas que no flotan.
- Carruseles en la portada: casi nadie pasa de la primera foto.
- Texto sobre una foto sin velo que garantice el contraste.

**Lo que sí:**

- Las fotos reales de la agencia **son** el diseño: composición editorial con tamaños y ritmos variados en el sitio; proporción intacta en la galería.
- Jerarquía tipográfica con contraste fuerte entre títulos y texto, de la pareja elegida.
- Textos específicos en la voz de la agencia (tipos de evento, lugares, procesos), en español de México.
- Espacios con ritmo y asimetría intencional, no bloques iguales apilados.
- Detalles que se notan sin verse: carga de fotos con su color dominante, foco visible, estados vacíos y de error escritos para personas.
- **Medibles:** máximo 2 familias tipográficas y 5 tamaños por página; texto corrido de 16 px o más y nada legible por debajo de 13 px; títulos de 2 líneas como máximo en cualquier ancho; en el sitio público y en la portada de la galería, la foto principal ocupa al menos la mitad de la primera pantalla (no aplica al login ni al panel). Las reglas y los números vienen de `taste-skill` (estudio de 247 sitios de galería) y su inspector los mide en un navegador real.

## 5. Plan por partes

Primero **todo lo de Focal Drop** (bloque A) y después **lo de las agencias** (bloque B). El panel es de Focal Drop y ya es parte del hito 0 (#18, #20 y la demo de la #27); el sistema de diseño es la base que luego visten los temas de cada agencia.

### Bloque A · Focal Drop

| Parte | Cuándo | Qué | Skills |
| ----- | ------ | --- | ------ |
| **A0 · Fundamentos** | Hecho | Este documento, D134 y la barra de calidad (§7). | `constraint-driven-development`, `documentation-and-adrs` |
| **A1 · Marca** | Ahora (Should, no bloquea la #27) | Refinar el logo: se conserva el símbolo (las dos mitades, Focal y Drop, con la línea axial); el wordmark usa una sans libre con carácter en lugar de la fuente del sistema; azul óptico propio (el actual, `#2563EB`, es el azul por defecto de Tailwind) y los neutros cálidos del cuarto oscuro. Variantes: ícono, favicon, claro y oscuro. Guía de marca corta. Se eligen sobre prototipos: 3 sans candidatas y 2 o 3 azules. | `frontend-design`, `impeccable`, `artifact-design`; reglas de la casa de `taste-skill` |
| **A2 · Sistema de diseño** | Ahora (Should, no bloquea la #27) | Tokens (escala tipográfica, espacios, colores semánticos, claro y oscuro en Tailwind v4), primitivas accesibles (Radix o React Aria) y componentes propios. | `impeccable`, `frontend-ui-engineering`, `emil-design-eng`, `source-driven-development`, `break-ui`, `web-design-guidelines` |
| **A3 · Pantallas del panel** | Ahora (Should): se muestra en la demo si está lista, sin bloquearla | Login, recuperar contraseña (#18), inicio (#20) y la navegación, con la marca aplicada. | `impeccable`, `emil-design-eng`, `break-ui`, `web-design-guidelines` |
| **A4 · focaldrop.com** | Al final del bloque (backlog, Should) | Una página sencilla: qué es, para quién, cómo se ve (panel y galería demo) y un contacto. Sirve de portafolio y prepara el SaaS. Sin precios ni registro. | `taste-skill`, `artifact-design` |

### Bloque B · Agencias

| Parte | Cuándo | Qué | Skills |
| ----- | ------ | --- | ------ |
| **B1 · Investigación y moodboard** | Hecho | Análisis de los dos sitios elegidos (§6). Pedir a la agencia sus fotos favoritas por tipo de trabajo. | `taste-skill`, navegador integrado |
| **B2 · Galería del cliente** | Hito 1 | Prototipo con fotos reales y luego la implementación: filas justificadas, visor con gestos, portada, selección y descarga. Usa el tema de la agencia sobre el sistema de A2. | `apple-design`, `animate`, `animation-performance`, `performance-optimization`, `break-ui`, `web-design-guidelines` |
| **B3 · Dirección de arte del sitio** | Inicio del hito 2 | 3 variantes del editorial cálido como prototipos, cada una en claro y oscuro y con 2 parejas tipográficas; la agencia elige. Catálogo de parejas y generador de tema con verificación de contraste. | `taste-skill`, `frontend-design`, `artifact-design`; `ui-ux-pro-max` solo como consulta |
| **B4 · Construcción del sitio** | Hito 2 | Secciones Must de la Parte C §3.5 (D25) con el tema por tokens y su edición en el panel; 2 rondas sobre el preview. | `taste-skill`, `impeccable`, `find-animation-opportunities`, `animate`, `performance-optimization`, `web-design-guidelines`, `break-ui` |

**Calidad continua (siempre):** checklist en la plantilla de PR, capturas automáticas en CI y presupuestos de rendimiento, con `constraint-driven-development`, `web-design-guidelines`, `break-ui` y `code-review`.

### Marca Focal Drop (acordado)

- **Personalidad:** óptica + cuarto oscuro. Precisión de lente (el azul, la línea axial) con la calidez del laboratorio (neutros cálidos). Sale del nombre y del nombre en clave `darkroom`.
- **Color:** un azul óptico propio, cercano al actual pero distinto del de Tailwind, con contraste AA; neutros cálidos de fondo.
- **Tipografía:** una sola sans libre con carácter para wordmark y panel, legible en tablas y formularios.

**Skills que no se usan aquí:** `soft-skill`, `minimalist-skill` y `brutalist-skill` imponen un estilo prefabricado; `image-to-code-skill` está pensada para otro agente; `huashu-design` duplica a `taste-skill`; `redesign-skill` es para sitios existentes; las de Figma requieren un asiento de edición.

## 6. Referencias de la agencia

Eligió 2 de los 5 sitios propuestos; descartó el estilo revista con tonos tierra, el minimalista blanco y el romántico en crema.

- **elizabethmessina.com:** fotos grandes que van pasando una por una, letra elegante.
- **jonaspeterson.com:** cinematográfico, foto a pantalla completa con el texto encima.

### Análisis (parte 1, 2026-10-20)

Medido con el inspector de `taste-skill` y el navegador integrado, a 1440, 768 y 390 px. Las capturas se quedaron fuera del repo: son obra de otros.

**Messina** está hecho con una plantilla de Pixieset, un competidor directo. Fondo blanco, fotos luminosas de luz natural presentadas en pares, y el portafolio organizado por **categorías que funcionan como puertas** (una foto grande con su nombre debajo). Una serif de display fina y en mayúsculas para títulos y una sans pequeña espaciada para todo lo demás, ambas de pago.

**Peterson** abre con una foto a sangre y un título serif corto encima. Sigue con una declaración en primera persona y un "quién soy" con su retrato, y cada trabajo se cuenta como **una historia**: nombre, lugar y fecha. Pero usa 6 tipografías y 12 tamaños, 17 etiquetas diminutas en mayúsculas, rayas finas, un carrusel en la portada y textos que quedan tapados al hacer scroll. **En celular, el recorte de la portada deja fuera a la pareja.**

**Lo que tomamos:**

- La foto manda: un fondo neutro (claro u oscuro) para que el color lo pongan las fotos.
- **Una sola foto de portada, grande, elegida por la agencia**, con un título corto. Nada de carrusel.
- El portafolio como **puertas por tipo de evento** (bodas y XV años, eventos, retrato, producto), que es justo lo que hace la agencia.
- **Cada trabajo como historia:** nombre del evento, lugar y fecha, en lugar de una cuadrícula anónima.
- **Presencia humana:** una sección "quiénes somos" con foto real del equipo y su voz en primera persona. Es Should del hito 4 (Parte C §3.5); mientras tanto, la voz de la agencia vive en los textos de la portada y del contacto.
- Una serif de display elegante con una de texto tranquila; equivalentes libres de licencia en el catálogo (parte 4).
- Ritmo lento y mucho aire.

**Lo que evitamos:** todo lo que el inspector marcó (exceso de fuentes y tamaños, etiquetas diminutas, rayas, carruseles, texto tapado o sin contraste) y el aire de plantilla genérica.

**Lo que esto exige a la plantilla:**

- **Punto focal por foto:** la agencia marca dónde está lo importante y el recorte lo respeta en cada ancho. Así no se pierde a la pareja en celular.
- **Velo automático** bajo cualquier texto sobre foto, con el contraste verificado.

### La idea propuesta (para validar en la parte 4)

`taste-skill` pide que la idea salga del sujeto, no de la categoría. En una plantilla el sujeto cambia con cada agencia, pero siempre hay dos cosas propias: **sus fotos y sus eventos**. La propuesta:

> En este sitio, **los eventos reales de la agencia** se vuelven **la estructura**: cada sección se cuenta con una historia suya (qué, dónde, cuándo), no con texto genérico.

**Lo único interactivo: "¿Qué estás celebrando?"** El visitante elige su ocasión (boda, XV años, evento, retrato o producto) y el sitio le muestra el trabajo de esa categoría, el paquete que le corresponde con su precio "desde" (D22) y un botón de WhatsApp con el mensaje ya escrito para esa ocasión (D31). Usa contenido real de la base de datos, funciona con el pulgar y sin JavaScript es un simple menú de enlaces. Responde la pregunta que un cliente medio trae al llegar: "¿hacen lo mío y cuánto cuesta?".

## 7. Barra de calidad

Obligatoria antes de mezclar un PR de interfaz:

1. **Accesibilidad WCAG 2.2 AA:** contraste (también en los temas de cada agencia), teclado, lectores de pantalla y foco visible.
2. **Rendimiento en celular:** Core Web Vitals en verde en un celular medio, LCP ≤ 2.5 s, CLS ≤ 0.1 e INP ≤ 200 ms.
3. **Checklist anti-genérico** (§4), revisada con las skills de crítica.
4. **Capturas automáticas en CI:** Playwright compara capturas de las páginas clave y avisa si algo cambió sin querer. Las referencias se actualizan solo a propósito. La infraestructura se instala con A2 y es **obligatoria desde la B2** (galería, hito 1), cuando ya hay pantallas que proteger.

## 8. Decisiones pendientes

- Radix o React Aria para las primitivas (parte 2).
- Biblioteca o código propio para las filas justificadas y el visor con gestos (parte 3).
- Las parejas tipográficas del catálogo (parte 4).
- El nombre y la marca definitivos de la agencia, cuando los tenga.
