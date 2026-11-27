# Hito 1 · Entrega de galerías

> **Especificación** del hito 1 (§1–9, aprobada el 2026-11-26) y su **plan** en features (§10). Detalla la [Parte C §2–3](../phase-1c-scope-and-closing.md) con las decisiones del 2026-11-26 (ver "Cambios a la Parte C"). El modelo de datos, los endpoints y los flujos están en la [Parte B](../phase-1b-data-and-users.md) §2.2, §8 y §9; aquí no se repiten.

## 1. Objetivo

**1a · Entregar.** La agencia sube una galería real (300 a 1,000 fotos JPG, de 7 a 24 GB, y algún MP4), la publica y le manda el link a un cliente real. El cliente la ve en su celular o en su computadora y descarga una foto o la galería completa en ZIP. Todo pasa en producción, con dominio temporal y sin intervención de nosotros.

**1b · Automatizar.** La galería vence sola, avisa por correo, pasa a la papelera y se purga, y R2 queda vacío. La agencia puede extender, restaurar y bajar su propia copia.

**Usuarios:** el owner de la agencia, desde el panel, casi siempre en su computadora; el cliente, desde el link, casi siempre en su celular.

### Cambios a la Parte C

Decididos por Rubén el 2026-11-26. Entran a la bitácora como D-nuevas, con la nota del PR de este plan.

| Cambio | Antes | Ahora | Por qué |
| --- | --- | --- | --- |
| **Producción ligera desde el hito 1** | Buckets de producción en el hito 3 | Supabase, R2, Cloud Run y los Workers de producción se montan en el hito 1, con dominio temporal | Los datos de clientes reales no deben convivir con staging ni con las previews de los PRs |
| **Correo con Resend y `mail.focaldrop.com`** | Resend y el dominio de la agencia en el hito 3 (D8) | Remitente de la plataforma, `Focal Drop <avisos@mail.focaldrop.com>`, con Reply-To de la agencia desde el hito 1. Va en un subdominio, como recomienda Resend, para no exponer la reputación de la raíz. Al lanzar se cambia al dominio de la agencia | Los avisos del hito 1 necesitan salir de algún dominio, y de paso se arregla la recuperación de contraseña en staging |
| **El hito se parte en 1a y 1b** | Un solo bloque | 1a entrega y 1b automatiza | La agencia puede entregar antes, y los riesgos técnicos (subida y ZIP) van primero |
| **El diseño B2 condiciona la vista del cliente** | B2 "en el hito 1" (D134) | El prototipo se aprueba en paralelo a los spikes, y la vista del cliente de 1a implementa lo aprobado | La galería es lo que el cliente de la agencia ve: no se entrega con una vista provisional |
| **Dominio temporal `<slug>.focaldrop.com`** | `*.workers.dev` hasta el dominio propio (Parte C §2) | Un subdominio por agencia de `focaldrop.com` (`platform_subdomain`), hasta que la agencia tenga el suyo (D7) | El cliente de la agencia recibe un link que se ve profesional; el DNS de `focaldrop.com` ya está en Cloudflare |
| **Respaldo nocturno desde el hito 1** | Respaldo y simulacro en el hito 3 (D4) | El workflow nocturno entra con la producción ligera; el simulacro de restauración sigue en el hito 3 | La BD de producción tiene datos reales desde el final de 1a, y Supabase Free no restaura a un punto en el tiempo |

## 2. Capacidades

Cada fila es un módulo con id fijo. Sus features se cortan en el plan. Las dependencias van en un solo sentido.

| Id | Qué entrega | Depende de | Parte |
| --- | --- | --- | --- |
| `prod-env` | Producción ligera y lo que falta en staging: R2, Resend, dominios y respaldo | — | 1a |
| `gallery-design` | Prototipo B2 con fotos reales, aprobado por la agencia | — | 1a |
| `clients` | Clientes y destinatarios | — | 1a |
| `galleries` | Galería en borrador y la lista del panel por estado | `clients` | 1a |
| `uploads` | Subida multipart directa a R2 con CRC-32 (S-5) | `prod-env`, `galleries` | 1a |
| `previews` | Vistas previas en el navegador del admin (S-1) | `uploads` | 1a |
| `publish` | Publicar, link único, copiar y WhatsApp | `uploads` | 1a |
| `client-view` | La galería del cliente y la descarga individual | `publish`, `previews`, `gallery-design` | 1a |
| `zip` | Worker de ZIP, etapa 1 (S-2) | `publish` | 1a |
| `download-progress` | Registro de descargas, avance X de Y y primera apertura | `client-view`, `zip` | 1a |
| `lifecycle` | Vencimiento, decisión, extender y restaurar con el cron | `publish`, `download-progress` | 1b |
| `trash` | Papelera, purga y "Eliminar ahora" | `lifecycle` | 1b |
| `notifications` | Outbox, envío con Resend y las 4 plantillas | `prod-env`, `lifecycle` | 1b |
| `agency-copy` | Copia de respaldo de la agencia | `zip` | 1b |

**Orden:** `prod-env`, `gallery-design` y `clients` arrancan juntos. Después van `galleries`, `uploads` con `previews`, `publish`, `zip`, `client-view` y `download-progress`. Al final, `lifecycle`, `trash`, `notifications` y `agency-copy`.

## 3. Especificación por capacidad

Lo que no dice cada fila lo dicen las decisiones citadas. Todas las capacidades cumplen además las reglas de la §6.

### `prod-env` · Producción ligera (lo configura Rubén, D116)

- Proyecto de Supabase de producción: el segundo que permite el plan Free, como ya preveía la Fase 2 §4 (D104). Con Data API apagada, solo llaves nuevas y ES256 (D121), y el *keepalive* diario de D139.
- R2 activado: un bucket por entorno, con CORS solo para los orígenes de cada entorno y `ETag` en `ExposeHeaders`, sin el cual las subidas multipart no se pueden completar. R2 ya aborta solo las subidas multipart incompletas a los 7 días; hay que comprobar que esa regla siga activa ([R2](https://developers.cloudflare.com/r2/objects/multipart-objects/#incomplete-upload-lifecycles)).
- Servicio de Cloud Run de producción en el mismo proyecto y con el mismo presupuesto con corte de US$5 (D124). Clave de cifrado de tokens (D42) en Secret Manager.
- Workers de producción para el front y para el ZIP:
  - el front, con una ruta comodín `*.focaldrop.com/*` y un registro DNS comodín con proxy. Las *Custom Domains* de Workers no aceptan comodines ([rutas](https://developers.cloudflare.com/workers/configuration/routing/routes/)). La documentación no dice si las rutas comodín dependen del plan, así que se confirma al configurarlas;
  - el ZIP, en un host fijo de la plataforma, como `zip.focaldrop.com`. El certificado gratuito solo cubre un nivel de subdominio, y `zip.<slug>.focaldrop.com` no tendría certificado válido ([Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/#hostname-coverage)). El link del ZIP va firmado, así que no necesita el host de la agencia.
- Resend con `mail.focaldrop.com` verificado en `us-east-1` (MX, SPF y DKIM en Cloudflare, en modo *DNS only*), y como SMTP de Supabase Auth en los dos entornos. La región no se puede cambiar sin volver a dar de alta el dominio ([Resend](https://resend.com/docs/dashboard/domains/introduction#subdomains)).
- Respaldo nocturno de D4: `supabase db dump`, cifrado, a un bucket de respaldos en R2, desde GitHub Actions.
- Sentry y UptimeRobot también en producción.
- Environment `production` de GitHub con sus variables y secretos (D126). El deploy a producción va por tag `v*.*.*` o `workflow_dispatch`, con la aprobación de la otra persona, y migra antes de desplegar (D104, D106, Fase 2 §6).
- **Hecho cuando:**
  - `/health` de producción responde;
  - el login del owner real funciona con su contraseña en `<slug>.focaldrop.com`;
  - un archivo de prueba se sube a R2 de producción y se borra;
  - el respaldo nocturno corrió una vez y su archivo se puede descifrar.

### `gallery-design` · Prototipo B2 (D134)

- Prototipo con las fotos de muestra de la agencia, que nunca entran al repo (D130): filas justificadas sin recortes, visor a pantalla completa con gestos, portada del evento con "Descargar todo" y banner de días restantes. También las páginas de link no válido y de galería vencida.
- Tema por defecto con el nombre de la agencia. El tema de cada agencia llega en el hito 2.
- Una ronda de aprobación con la agencia sobre el prototipo; las dos rondas sobre la preview van con `client-view`.
- **Hecho cuando:** la agencia lo aprueba por escrito y las reglas medibles del plan de diseño (§3) se cumplen en el prototipo.

### `clients` · Clientes (D71)

- Crear, editar y listar clientes: owner y staff. Borrar: solo el owner, y `RESTRICT` si tiene galerías.
- Destinatarios por galería (`gallery_recipients`, D19), con correo validado.
- **Hecho cuando:** el CRUD pasa por los guards de F5, y el e2e de 404 entre agencias cubre clientes y destinatarios.

### `galleries` · Borradores y lista

- Crear, editar y borrar borradores: título, fecha del evento, cliente y destinatarios.
- La lista del panel muestra las galerías por estado y las acciones pendientes. Galerías y Clientes entran a la navegación del panel, con el menú del celular que faltaba (nota del #91).
- **Hecho cuando:** un borrador se crea, se edita y va a la papelera, y la lista lo muestra en el estado correcto, en celular y en computadora.

### `uploads` · Subida (S-5, D66)

- **Spike S-5 primero**, con sus umbrales de la Parte A: 1,000 archivos o 10 GB sin intervención, reanudación tras volver a elegir los archivos, y el CRC-32 no retrasa la subida.
- Uppy 6 (`@uppy/aws-s3`) directo del navegador a R2, firmado por Nest con su `signRequest`. Una sola firma cubre el PUT simple y las cinco operaciones multipart ([Uppy](https://uppy.io/docs/aws-s3/)). Esto cambia los nombres de endpoints de la Parte B §8. Por defecto, Uppy usa multipart solo arriba de 100 MiB, así que casi todos los JPG van en un PUT (hasta 5 GiB) y los videos en partes. S-5 confirma ese umbral y la concurrencia, en lugar de los "4 archivos × 4 partes" de la Parte C.
- CRC-32 en un Web Worker durante la subida; al completar, Nest verifica con `HeadObject`. Un archivo sin CRC no cuenta como subido.
- Los bytes nunca pasan por Next ni por Nest. Las credenciales de R2 solo viven en el módulo `storage` de Nest.
- **Hecho cuando:** una galería de prueba con las muestras de la agencia, repetidas hasta pasar de 300 archivos, se sube completa en staging, y un corte de red a la mitad se recupera sin volver a subir lo terminado.

### `previews` · Vistas previas (S-1, D52, D144)

- **Spike S-1 junto con S-5**, con los umbrales de la Parte A medidos con los JPG reales de 24 MP: al menos 95 % de las muestras con vista previa, menos de 2 s por foto y sin errores de memoria con 300 archivos seguidos.
- Miniatura de 400 px y vista de 2048 px en WebP, sin metadatos, generadas en el navegador del admin.
- MP4: un cuadro si el navegador lo decodifica; si no, un ícono. Los videos solo se descargan (D144).
- "Regenerar vistas previas" descarga el original desde R2 al navegador del admin.
- **Hecho cuando:** la galería de prueba tiene todas sus vistas previas, y el WebP no lleva EXIF (verificado).

### `publish` · Publicar y link (D15, D42, D72)

- Publicar exige todos los originales subidos. Vence a los 30 días.
- Antes de la primera publicación, la agencia acepta la política "entrega, no archivo" una sola vez (`storage_policy_accepted_at`).
- Un link activo por galería: token de 128 bits, cifrado con AES-256-GCM y guardado con su hash SHA-256 (D42). Regenerar el link invalida las sesiones (D43, D72).
- Copiar el link y abrir WhatsApp con un mensaje prellenado.
- **Hecho cuando:** publicar una galería incompleta devuelve error, el link sobrevive a que lo copien de nuevo, y uno regenerado invalida al anterior y a sus sesiones.

### `client-view` · Galería del cliente (D43, D53, D134)

- `/g/<token>`: cookie firmada con `Path=/g/<token>` (D43), y `noindex` y `Referrer-Policy: no-referrer` (D53).
- Implementa el prototipo aprobado de `gallery-design`. Las dos rondas de la agencia sobre la preview, y sus ajustes, van aparte para no frenar el PR principal.
- Un archivo sin vista previa (un MP4 del que el navegador no sacó un cuadro) muestra un ícono.
- Página de link no válido y de galería vencida, con el botón de WhatsApp de la agencia.
- Descarga individual del original con URL prefirmada de 5 minutos y `Content-Disposition: attachment`.
- **Capturas de Playwright y axe obligatorias** desde aquí: el job `visual` se vuelve requerido (plan de diseño §7).
- **Hecho cuando:** en un iPhone y en Windows el cliente abre el link, recorre la galería, abre el visor y descarga una foto con el mismo CRC-32 que el original.

### `zip` · Worker de ZIP, etapa 1 (S-2, D65, D84, D130)

- **Spike S-2 primero:** el ZIP compuesto al vuelo abre en el Explorador de Windows, la Utilidad de Archivo de macOS, Archivos de iOS, Android y 7-Zip, y se mide la CPU por cada 100 archivos para decidir si Workers Free alcanza (gatillo de la ADR-0010).
- `apps/zip-worker`: streaming con `Content-Length` exacto y **ZIP64** (D130), sin Range. Hasta 1,000 archivos por galería con Workers Free, por su límite de lecturas internas a R2 (D84).
- Nest arma el manifiesto y firma el link con HMAC: 24 h y revocable (D53, D65).
- Prueba de integración de los bytes del ZIP con `unzip -t`, incluido un caso de más de 4 GiB con datos sintéticos.
- **Hecho cuando:** un ZIP de más de 2 GB de la galería de prueba se descarga y abre sin errores en Windows y en iOS.

### `download-progress` · Avance (D44, D70, D74)

- Cuenta como descargado: en la individual, cuando Nest emite la URL; en el ZIP, cuando el Worker termina de enviar ese archivo (D44).
- `download_items` idempotente (D74). Las descargas de la agencia no cuentan (D70).
- La lista del panel muestra el avance X de Y y la primera apertura.
- **Hecho cuando:** descargar la misma foto dos veces cuenta una, y el ZIP completo deja la galería en Y de Y.

### `lifecycle` · Vencimiento (D14, D16, D55, D61)

- Cron `lifecycle` cada hora: `pg_cron` y `pg_net` llaman a Nest con un secreto (D46). `pg_net` está en beta y corta a los 2 s por defecto ([pg_net](https://supabase.com/docs/guides/database/extensions/pg_net#configuration)). Con el arranque en frío de la API (#107), la llamada lleva un tiempo de espera mayor y el endpoint es idempotente: repetirlo no cambia nada.
- Al vencer: si todo se descargó, pasa a la papelera; si no, a `pending_decision`, con 60 días para decidir (D16).
- Extender (nueva fecha mayor que hoy y hasta un año) y restaurar, desde los estados que permite D55.
- Cada transición es `UPDATE … WHERE status = … RETURNING` más su fila en el outbox, en la misma transacción (D61).
- **Hecho cuando:** las pruebas unitarias cubren todas las transiciones permitidas y rechazan las demás, y una galería con fechas cortas vence sola en staging.

### `trash` · Papelera y purga (D14, D48)

- Papelera de 7 días, restaurable. Todo borrado pasa por ahí, también el manual (D48). "Eliminar ahora" es solo del owner.
- Purga: primero se vacía el prefijo de la galería en R2 y después se borran las filas (`deleting`).
- **Hecho cuando:** una galería purgada deja su prefijo de R2 vacío (verificado a mano una vez, Parte C §4) y no deja filas huérfanas.

### `notifications` · Avisos (D47, D95)

- Outbox con dispatcher, reintentos y tope diario. Cron `notifications` cada 10 minutos, que de paso mantiene despierta la API (D46, #107).
- El tope diario no pasa de 100 correos: es el límite de Resend Free, que también cuenta los correos de Supabase Auth ([Resend](https://resend.com/docs/knowledge-base/account-quotas-and-limits)).
- Cron `reminders` diario, a las 10:00 de la CDMX: encola `gallery_expiring` y `agency_gallery_trash_warning`. Los demás recordatorios que prevé la Parte A son del hito 4.
- Proveedor de correo con Resend en staging y producción, y Mailpit en local (`EMAIL_PROVIDER`, Fase 2 §4).
- Las 4 plantillas de React Email:
  - `gallery_published`, a los destinatarios;
  - `gallery_expiring`, una vez, 3 días antes;
  - `agency_gallery_pending_decision`;
  - `agency_gallery_trash_warning`, un día antes de purgar.
- **Hecho cuando:** los 4 correos llegan en staging con su plantilla, un fallo del proveedor se reintenta, y el tope diario se respeta.

### `agency-copy` · Copia de la agencia (D15, D70)

- Desde el panel, el owner descarga la galería completa con el mismo Worker de ZIP, marcada como `initiated_by` agencia.
- **Hecho cuando:** la copia se descarga completa y el avance del cliente no cambia.

## 4. Entornos y cuentas

| Entorno | Para qué | Datos |
| --- | --- | --- |
| Local | Desarrollo y pruebas (D90) | Agencias ficticias |
| Staging | CI, previews de PRs y pruebas con las muestras de la agencia | Agencias ficticias y muestras; nunca clientes reales |
| Producción | La agencia y sus clientes reales | Reales |

**Costos:** R2 sobre su nivel gratuito es el único gasto (aceptado, D11 y D130: unos US$1.5–7.5 al mes). Supabase, Cloud Run, Resend, UptimeRobot y Sentry quedan en sus planes gratuitos. Workers Free sigue hasta su gatillo (ADR-0010).

## 5. Pruebas

Las obligatorias de `CLAUDE.md` y de la Parte C §3.7, en su capacidad:

- **Aislamiento entre agencias (e2e):** cada recurso nuevo (clientes, galerías, archivos, descargas) responde 404 a otra agencia.
- **Máquina de estados (unitarias):** en `lifecycle` y `trash`.
- **Bytes del ZIP (integración):** en `zip`, con `unzip -t`.
- **Permisos de `app_api` y RLS (integración):** para las 9 tablas del hito (D89).
- **Esquemas Zod** de todo payload nuevo, en `@focaldrop/shared`.
- **Capturas y axe** de la galería del cliente, requeridas desde `client-view`.
- Las nuevas dependencias (Uppy, React Email, el SDK de Resend) cumplen D131, y la CI lo revisa sola (#105).

## 6. Límites

**Siempre:**

- `agency_id` del contexto, nunca del body; un recurso de otra agencia responde 404 (ADR-0001).
- Los archivos van del navegador a R2 y de R2 al navegador. El ZIP lo arma el Worker.
- Transiciones con `UPDATE … WHERE status = … RETURNING` y su fila en el outbox, en la misma transacción.
- Tokens cifrados con su hash, cookies firmadas, links de ZIP firmados y revocables, y `attachment` en las descargas.
- Textos de interfaz en el diccionario `es-MX`.

**Preguntar antes:**

- Tablas o columnas fuera de las 9 de D89, o cambios a la máquina de estados.
- Cualquier gasto fuera de los planes gratuitos, salvo R2.
- Cuentas, secretos o dominios nuevos (los configura Rubén).
- Cambios a los checks requeridos de la CI.

**Nunca:**

- Datos de la agencia o de sus clientes en el repo, en las pruebas o en los logs; las capturas usan agencias ficticias.
- Fotos de la agencia en el repo, ni siquiera las muestras.
- Borrar filas antes de vaciar R2.
- Datos reales en staging o en las previews.

## 7. Criterios de éxito

**1a terminado cuando:**

1. La agencia publica en producción una galería real de al menos 300 fotos sin ayuda nuestra.
2. Su cliente la abre en el celular, descarga una foto, y en la computadora descarga el ZIP y lo abre sin errores.
3. El panel muestra su avance X de Y.
4. La CI pasa con el aislamiento de los recursos nuevos, los bytes del ZIP y las capturas y axe de la galería.

**1b terminado cuando:**

1. Una galería vence sola, pasa por `pending_decision` o por la papelera según sus descargas, y se purga con su prefijo de R2 vacío.
2. Los 4 avisos llegan por correo con su plantilla.
3. Extender, restaurar y la copia de la agencia funcionan en producción.
4. La máquina de estados tiene pruebas de todas sus transiciones.

## 8. Preguntas resueltas (2026-11-26)

1. **Dominio temporal:** `<slug>.focaldrop.com`, no `*.workers.dev`. Está en la tabla de cambios, y el enrutamiento se verifica en `prod-env`.
2. **Respaldo de la BD de producción:** el workflow nocturno de D4 se adelanta a `prod-env`, y el simulacro sigue en el hito 3.
3. **Aviso de privacidad:** basta el de la agencia durante el hito 1 (ver Supuestos). Nuestro aviso editable y su revisión legal siguen en el hito 2.

## 9. Supuestos

- 15 h a la semana entre los dos (S7). Las horas del plan se corrigen en la retro.
- **Privacidad:** la agencia es la responsable de los datos de sus clientes, y la plataforma los trata por encargo. En el hito 1 basta el aviso que la agencia ya da a sus clientes; le pedimos que mencione que usa una plataforma para entregar las galerías. No es una opinión legal: la revisión legal del aviso sigue pendiente (bitácora §6).
- La galería usa un tema por defecto con el nombre de la agencia hasta el hito 2.
- Las fotos y el video de muestra de la agencia (D130) bastan para S-1, S-5 y el prototipo. Quedan fuera del repo.
- La agencia entrega galerías de hasta 1,000 archivos, así que Workers Free alcanza para el ZIP si S-2 lo confirma.

## 10. Plan

Cada feature es vertical (D138): la hace una sola persona, con BD, API, web, pruebas y nota de bitácora, y dura máximo unos 2 días. Las horas incluyen el margen del 30 % de la Parte C y se corrigen con los tiempos reales. **R** marca las features que tocan cuentas, que configura Rubén (D116). Las demás se toman de "Hito actual" en este orden.

Ajustado el 2026-11-27 con la revisión de Fabian: H1-16 depende de las vistas previas, los spikes S-5 y S-1 van por separado, las rondas con la agencia tienen su propia feature y el menú del celular sale de Clientes.

### 10.1 Features de 1a · Entregar

| #     | Feature                                           | Capacidad           | Horas | Depende de   | Quién        |
| ----- | ------------------------------------------------- | ------------------- | ----- | ------------ | ------------ |
| H1-01 | R2 en staging y producción, y el módulo `storage` | `prod-env`          | 4     | —            | R            |
| H1-02 | Clientes                                          | `clients`           | 5     | —            |              |
| H1-03 | Navegación del panel en celular                   | `galleries`         | 2     | —            |              |
| H1-04 | Spike S-5: subida                                 | `uploads`           | 4     | H1-01        |              |
| H1-05 | Spike S-1: vistas previas                         | `previews`          | 4     | —            |              |
| H1-06 | Spike S-2: ZIP en el Worker                       | `zip`               | 8     | H1-01        |              |
| H1-07 | Prototipo B2 y su ronda con la agencia            | `gallery-design`    | 8     | —            | R (S8)       |
| H1-08 | Galería en borrador y lista del panel             | `galleries`         | 8     | H1-02        |              |
| H1-09 | Producción ligera en `<slug>.focaldrop.com`       | `prod-env`          | 8     | H1-01        | R            |
| H1-10 | Resend y SMTP de Supabase Auth                    | `prod-env`          | 3     | —            | R            |
| H1-11 | Firmas de subida y verificación en Nest           | `uploads`           | 6     | H1-04, H1-08 |              |
| H1-12 | Subida desde el panel                             | `uploads`           | 7     | H1-11        |              |
| H1-13 | Vistas previas                                    | `previews`          | 6     | H1-05, H1-12 |              |
| H1-14 | Publicar y link                                   | `publish`           | 7     | H1-12        |              |
| H1-15 | Worker de ZIP en staging y producción             | `zip`               | 8     | H1-06, H1-09 |              |
| H1-16 | Acceso del cliente y su sesión                    | `client-view`       | 7     | H1-13, H1-14 |              |
| H1-17 | "Descargar todo": manifiesto y link firmado       | `zip`               | 5     | H1-14, H1-15 |              |
| H1-18 | La galería del cliente (B2)                       | `client-view`       | 8     | H1-07, H1-16 |              |
| H1-19 | Ajustes de las rondas con la agencia              | `client-view`       | 3     | H1-18        |              |
| H1-20 | Descarga individual                               | `client-view`       | 3     | H1-16        |              |
| H1-21 | Avance X de Y y primera apertura                  | `download-progress` | 5     | H1-17, H1-20 |              |
| H1-22 | Respaldo nocturno                                 | `prod-env`          | 4     | H1-09        | R (secretos) |
|       | **Total 1a**                                      |                     | 123   |              |              |

### 10.2 Features de 1b · Automatizar

| #     | Feature                                | Capacidad       | Horas | Depende de   | Quién |
| ----- | -------------------------------------- | --------------- | ----- | ------------ | ----- |
| H1-23 | Máquina de estados y cron `lifecycle`  | `lifecycle`     | 8     | H1-21        |       |
| H1-24 | Outbox y envío con Resend              | `notifications` | 7     | H1-10, H1-23 |       |
| H1-25 | Extender y restaurar                   | `lifecycle`     | 5     | H1-23        |       |
| H1-26 | Papelera y purga                       | `trash`         | 7     | H1-23        |       |
| H1-27 | Las 4 plantillas y el cron `reminders` | `notifications` | 6     | H1-24        |       |
| H1-28 | Copia de la agencia                    | `agency-copy`   | 3     | H1-17        |       |
| H1-29 | Visor con gestos                       | `client-view`   | 5     | H1-18        |       |
| H1-30 | Cierre del hito 1                      | —               | 3     | todas        | Ambos |
|       | **Total 1b**                           |                 | 44    |              |       |

**Total: unas 167 h**, 11 semanas a 15 h. 1a toma unas 8 semanas y 1b, unas 3. La Parte C estimaba 140–170 h; este corte suma 19 h de producción ligera y respaldo que antes eran del hito 3.

**En paralelo:** al arrancar, Rubén toma las cuentas (H1-01, H1-09 y H1-10) y el prototipo (H1-07), y Fabian toma clientes y borradores (H1-02 y H1-08). El menú del celular (H1-03) y el spike S-1 (H1-05) no dependen de nada, y los toma quien quede libre. Los spikes S-5 y S-2 (H1-04 y H1-06) esperan a que exista R2.

### 10.3 Criterios por feature

Cada issue copia sus criterios de aquí. Todas cumplen además la §5 y la §6.

- **H1-01:**
  - buckets de staging y de producción con el CORS de la §3, y la regla de 7 días comprobada;
  - credenciales en Secret Manager y en los Environments;
  - el módulo `storage` de Nest es el único con credenciales de R2, y firma un PUT que se verifica con `HeadObject` contra staging, a mano. En la CI va con un doble.
- **H1-02:** el CRUD de clientes de la §3, con el e2e de 404 entre agencias.
- **H1-03:** Clientes y Galerías en la navegación del panel, con el menú del celular (la hoja de Mesa de luz) y sus capturas.
- **H1-04:**
  - los umbrales de S-5 de la Parte A, medidos con las muestras de la agencia, en un máximo de 4 h;
  - una nota en `docs/log/` con lo medido y la configuración elegida de Uppy 6 (umbral de multipart y concurrencia);
  - el código del spike vive en su rama y no se mezcla (como S-4).
- **H1-05:**
  - los umbrales de S-1 de la Parte A, medidos en el navegador con los JPG reales de 24 MP, en un máximo de 4 h. No necesita R2;
  - una nota en `docs/log/` con lo medido y cómo se libera la memoria entre imágenes;
  - el código del spike vive en su rama y no se mezcla.
- **H1-06:**
  - el ZIP abre en el Explorador de Windows, la Utilidad de Archivo de macOS, Archivos de iOS, Android y 7-Zip, también uno de más de 4 GiB con ZIP64;
  - CPU medida por cada 100 archivos;
  - decisión de Workers Free o Paid para el ZIP con el gatillo de la ADR-0010.
- **H1-07:**
  - la agencia aprueba el prototipo por escrito, y cumple las reglas medibles del plan de diseño §3;
  - lo que entra al repo usa fotos de prueba, nunca las de la agencia.
- **H1-08:**
  - migración de `galleries` y `gallery_recipients` con los permisos de `app_api` probados;
  - crear, editar y borrar borradores (el borrado va a `pending_deletion`, D48);
  - la lista por estado, con el e2e de 404.
- **H1-09:** el "hecho cuando" de `prod-env`, salvo el respaldo:
  - `/health` de producción responde;
  - el login del owner real funciona en `<slug>.focaldrop.com`;
  - la llave de cifrado de tokens (D42) vive en Secret Manager;
  - el deploy va por tag con la aprobación de la otra persona.
- **H1-10:**
  - Resend verifica `mail.focaldrop.com`;
  - Supabase Auth de staging y de producción usa ese SMTP;
  - la recuperación de contraseña funciona en staging con la plantilla de D133.

  Staging quedó hecho el 2026-11-26; falta producción, que espera a H1-09.
- **H1-11:**
  - migración de `gallery_files`;
  - la firma para el `signRequest` de Uppy (PUT simple y multipart), limitada a la galería y a la agencia del contexto;
  - al completar, el CRC-32 se guarda y el tamaño se verifica con `HeadObject`. El e2e de 404 cubre los archivos.
- **H1-12:**
  - Uppy en el panel con cola, progreso y reintentos, y el CRC-32 en un Web Worker;
  - reanudar tras volver a elegir los archivos no sube de nuevo lo terminado;
  - pasa el umbral de S-5 en staging, con más de 300 archivos.
- **H1-13:**
  - miniaturas de 400 px y vistas de 2048 px en WebP, sin EXIF (verificado), con lo que dejó S-1;
  - MP4 con un cuadro o un ícono;
  - "Regenerar vistas previas" funciona.
- **H1-14:**
  - la política "entrega, no archivo" se acepta una vez;
  - publicar exige todos los originales subidos y fija el vencimiento a 30 días. La fila del outbox la agrega H1-24;
  - el link lleva un token de 128 bits con AES-256-GCM, su hash y su `key_version` (la llave sale de una variable en local y staging, y de H1-09 en producción). Regenerarlo invalida al anterior y a sus sesiones. Copiar y WhatsApp funcionan.
- **H1-15:**
  - `apps/zip-worker` con streaming, `Content-Length` exacto y ZIP64, que verifica la firma HMAC;
  - la prueba de bytes con `unzip -t`, incluido un caso de más de 4 GiB con datos sintéticos, corre en la CI;
  - deploy a staging y a producción.
- **H1-16:**
  - `/g/[token]` se resuelve en Nest por el hash del token, y distingue vigente, vencida y no válido;
  - cookie firmada con `Path=/g/<token>`, `noindex` y `no-referrer`;
  - listado paginado con las URLs de las vistas previas, y un ícono para los archivos que no tienen. Un token de otra agencia responde como no válido.
- **H1-17:**
  - migración de `downloads`;
  - el manifiesto y el link firmado de 24 h, revocable;
  - un ZIP de más de 2 GB abre en Windows y en iOS.
- **H1-18:**
  - implementa el prototipo aprobado: filas justificadas, portada, banner y visor básico. Se mezcla con su revisión normal, sin esperar a la agencia;
  - capturas y axe de la galería;
  - el job `visual` pasa a ser requerido. Cambiar los checks requeridos le toca a Rubén (§6).
- **H1-19:**
  - las dos rondas de la agencia sobre la preview, y sus ajustes en PRs chicos;
  - las capturas se actualizan a propósito en cada ajuste;
  - la agencia aprueba la galería antes de la primera entrega real.
- **H1-20:** URL prefirmada de 5 minutos con `attachment`, y el archivo baja con el mismo CRC-32 que el original, en un iPhone y en Windows.
- **H1-21:**
  - `download_items` idempotente, y el Worker reporta cada archivo con firma HMAC;
  - las descargas de la agencia no cuentan;
  - la lista muestra X de Y y la primera apertura.
- **H1-22:**
  - el respaldo nocturno cifrado llega a su bucket de R2;
  - se descifra una vez a mano;
  - no deja datos en los logs.
- **H1-23:**
  - el servicio de transiciones con `UPDATE … WHERE … RETURNING`;
  - el cron `lifecycle` cada hora, con el tiempo de espera y la idempotencia de la §3;
  - pruebas unitarias de todas las transiciones, y una galería con fechas cortas vence sola en staging.
- **H1-24:**
  - migración de `notifications`, con dispatcher, reintentos, tope diario y Mailpit en local;
  - publicar y vencer escriben su fila del outbox en la misma transacción;
  - el cron `notifications` cada 10 minutos.
- **H1-25:**
  - migración de `gallery_extensions`;
  - extender y restaurar desde los estados de D55, con su validación de fecha;
  - las dos acciones en el panel.
- **H1-26:**
  - papelera de 7 días y "Eliminar ahora" solo para el owner;
  - la purga vacía el prefijo de R2, paginado, antes de borrar las filas;
  - una prueba comprueba que el prefijo quedó vacío.
- **H1-27:** las 4 plantillas con React Email y el cron `reminders`; los 4 correos llegan en staging.
- **H1-28:** la copia sale con el mismo ZIP, marcada como de la agencia, y no cambia el avance.
- **H1-29:** deslizar, pellizcar y cerrar en el visor, con `prefers-reduced-motion` respetado y sus capturas.
- **H1-30:**
  - los criterios de éxito de 1a y 1b, verificados en producción;
  - la retro con horas estimadas contra reales;
  - el tag y el tablero del hito 2.

### 10.4 Puntos de revisión

1. **Después de los spikes** (H1-04, H1-05 y H1-06): D-nuevas con lo medido, ajuste de horas y, si hace falta, cambio de plan antes de construir la subida y el ZIP.
2. **Cierre de 1a:** la primera galería real en producción, el job `visual` requerido y una retro corta.
3. **Cierre de 1b:** es el cierre del hito (H1-30).

### 10.5 Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| La subida falla con galerías grandes (CORS, reanudación, memoria del CRC-32) | Alto | S-5 primero y con las muestras reales. Si Uppy no alcanza, se replantea antes de H1-11 |
| Las vistas previas de JPG de 24 MP agotan la memoria del navegador | Medio | S-1 mide con 300 archivos seguidos; se generan en serie y se libera cada imagen |
| El ZIP rebasa la CPU de Workers Free | Medio | S-2 lo mide; el gatillo a Workers Paid (US$5) ya está en la ADR-0010 |
| La aprobación de la agencia se retrasa | Medio | El prototipo va en paralelo desde el inicio, y las rondas sobre la preview tienen su feature (H1-19) para no frenar H1-18 |
| El arranque en frío de la API corta el cron o la primera visita | Medio | #107, el tiempo de espera de `pg_net` y endpoints idempotentes |
| La producción gasta más del presupuesto de US$5 de Google Cloud | Bajo | Sin instancias mínimas (D124, ADR-0010) y con el corte probado |
