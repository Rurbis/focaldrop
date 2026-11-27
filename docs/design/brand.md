# Marca Focal Drop

> D135, elegida el 2026-10-20 sobre el prototipo de la issue #51. Precisa D118 y D134. Aplica al panel, a los correos de la plataforma, a focaldrop.com (A4) y al crédito "Hecho con Focal Drop". Nunca al tema de una agencia más allá de ese crédito.

## Personalidad: óptica + cuarto oscuro

- **Precisión de lente:** el azul, la línea axial del símbolo y formas exactas.
- **Calidez de laboratorio:** neutros cálidos, nada de los grises fríos de plantilla.
- **De dónde sale:** *focal* (la lente), *drop* (la entrega) y el nombre en clave del proyecto, `darkroom`. El azul es el de la **cianotipia**, un proceso fotográfico de revelado: la marca sale de la fotografía, no de una paleta de moda.

## Logo

El símbolo son dos mitades separadas por una línea axial: a la izquierda **Focal**, en tinta; a la derecha **Drop**, en azul cianotipia y desplazada hacia abajo. El wordmark es `focaldrop` en minúsculas, en Instrument Sans 600 con espaciado de −0.035 em, **convertido a trazos** para que se vea igual sin la fuente instalada.

| Archivo                                                                  | Uso                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`logo-light.svg`](../../apps/web/public/brand/logo-light.svg)           | Logo horizontal sobre fondos claros                                         |
| [`logo-dark.svg`](../../apps/web/public/brand/logo-dark.svg)             | Logo horizontal sobre fondos oscuros                                        |
| [`symbol-light.svg`](../../apps/web/public/brand/symbol-light.svg) / [`symbol-dark.svg`](../../apps/web/public/brand/symbol-dark.svg) | Solo el símbolo, donde no cabe el wordmark |
| [`icon.svg`](../../apps/web/public/icon.svg)                              | Favicon: sin línea axial (desaparece a 16 px) y sigue el tema del navegador |
| [`favicon.ico`](../../apps/web/public/favicon.ico)                        | El mismo símbolo en 16, 32 y 48 px, sobre un cuadro papel redondeado, para los navegadores que no leen SVG: un ICO no sigue el tema y la mitad en tinta se perdería en una pestaña oscura |
| [`apple-touch-icon.png`](../../apps/web/public/apple-touch-icon.png)      | Ícono de 180 px para iOS, sobre el fondo papel                              |

Los íconos van en `apps/web/public/` y se declaran en `src/app/layout.tsx`: así Cloudflare los sirve como archivos estáticos, sin ejecutar el Worker. Dentro de `src/app/` serían rutas de Next, y cada petición gastaría CPU del Worker.

**Reglas:**

- Espacio libre alrededor: el ancho de una mitad del símbolo.
- Tamaño mínimo: el logo horizontal, 96 px de ancho; el símbolo, 16 px (como en el favicon, sin línea).
- No cambiar sus colores fuera de esta paleta, no deformarlo y no agregarle sombras, contornos ni degradados.
- Sobre una foto solo con un fondo sólido detrás.
- No recrear el wordmark con texto: usar los SVG. Si cambia, se regenera convirtiendo el texto en trazos desde la fuente.

## Color

Un solo acento: va en la acción principal, los enlaces y el foco. Es el cian de los logos (2026-11-27): `#06B6D4` en oscuro, sobre un grafito frío con texto crema, y el mismo tono más oscuro en claro, `#066A7A`, porque `#06B6D4` queda en 3.5:1  ||||||sobre papel claro. El símbolo y el wordmark conservan sus colores hasta rediseñar el logo. Los colores de estado (error, aviso, éxito) se definen en A2 (#52) con el mismo cuidado de contraste.

| Rol                   | Claro     | Oscuro    | Uso                                       |
| --------------------- | --------- | --------- | ----------------------------------------- |
| Papel (fondo)         | `#EFECE6` | `#121316` | Fondo de la página                         |
| Superficie            | `#FBF9F5` | `#1A1C20` | Tarjetas y paneles                         |
| Elevado               | `#E3DFD7` | `#25282D` | Barras, selección y botones secundarios    |
| Tinta                 | `#18181B` | `#EDE0D4` | Texto                                      |
| Tinta secundaria      | `#5E5850` | `#B3A79B` | Notas y etiquetas                          |
| Borde de campo        | `#8A847C` | `#7A736C` | Contorno de los campos de formulario       |
| **Acento**            | `#066A7A` | `#06B6D4` | El cian de los logos                       |
| Texto sobre el acento | `#FFFFFF` | `#121316` | Texto de los botones principales           |
| Acento suave          | `#DFF2F5` | `#0B3640` | Fondo de estados ("Publicada")             |

**Contraste verificado (WCAG 2.2):**

| Par                                     | Claro  | Oscuro |
| --------------------------------------- | ------ | ------ |
| Tinta sobre papel                       | 15.0:1 | 14.3:1 |
| Tinta secundaria sobre papel            | 6.0:1  | 7.9:1  |
| Acento sobre papel (enlaces)            | 5.3:1  | 7.7:1  |
| Texto sobre el botón de acento          | 6.3:1  | 7.7:1  |
| Acento sobre acento suave               | 5.4:1  | 5.4:1  |
| Borde de campo (mínimo 3:1)             | 3.5:1  | 3.7:1  |

El azul anterior, `#2563EB`, era el azul por defecto de Tailwind (`blue-600`) y quedaba en 4.6:1 sobre el papel. La cianotipia (`#1F4E8C`, D135) se usó hasta el 2026-11-27.

## Tipografía

- **Instrument Sans** (Google Fonts, licencia OFL) para todo lo de Focal Drop: wordmark (600), títulos (600), texto (400 y 500) y números tabulares en las tablas.
- Se carga con `next/font`. La escala, de 5 tamaños como máximo, se fija en A2 (#52).
- Las agencias usan su propia pareja tipográfica del catálogo (D134), no esta.

## Voz

- Español de México, tuteando a la agencia: "Publica tu galería".
- **Precisa y cálida:** dice qué pasó y qué sigue, sin tecnicismos ni relleno. Bien: "Tu galería vence el 18 de noviembre. Ana ya descargó 312 de 412 fotos." Mal: "¡Ups! Algo salió mal".
- Los errores dicen qué pasó y qué hacer.
- Sin emojis en la interfaz.
