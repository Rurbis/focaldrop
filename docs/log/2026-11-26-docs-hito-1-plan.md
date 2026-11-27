# docs: specify and plan milestone 1

Issue: #27 (tablero del hito 1) · PR: #109 · Autor: Rubén

## Decisiones

Las seis vienen de la entrevista del 2026-11-26 y están en [`milestones/hito-1.md`](../milestones/hito-1.md) §1 ("Cambios a la Parte C") y §8.

- **D-nueva · Producción ligera desde el hito 1** (precisa la Parte C §2 y D104). Supabase, R2, Cloud Run y los Workers de producción se montan en el hito 1, con dominio temporal, en lugar de dejar los buckets de producción para el hito 3. **Por qué:** la primera galería real termina en 1a, y los datos de clientes reales no deben convivir con staging ni con las previews de los PRs, que comparten API y BD. Cuesta unas 15 h que antes eran del hito 3 y no agrega gasto: el segundo proyecto de Supabase ya estaba previsto (Fase 2 §4).
- **D-nueva · Correo con Resend y `mail.focaldrop.com` desde el hito 1** (precisa D8). Remitente de la plataforma, `Focal Drop <avisos@mail.focaldrop.com>`, con Reply-To de la agencia hasta que la agencia tenga su dominio. Va en un subdominio, como recomienda Resend, para que la reputación de envío no afecte a la raíz, que queda libre para recibir correo y para la página A4. También es el SMTP de Supabase Auth en los dos entornos. **Por qué:** los avisos del hito 1 necesitan un dominio, y con eso se arregla la recuperación de contraseña en staging, que hoy no tiene plantilla propia. El plan Free de Resend permite 100 correos al día, así que el tope diario del outbox no pasa de ahí.
- **D-nueva · El hito 1 se parte en 1a (entregar) y 1b (automatizar)** (precisa la Parte C §2). 1a: clientes, borradores, subida, vistas previas, publicar, galería del cliente, descarga individual, ZIP y avance. 1b: vencimiento, papelera y purga, avisos, extender, restaurar y la copia de la agencia. **Por qué:** la agencia puede entregar una galería antes, y los riesgos técnicos (subida y ZIP) van primero.
- **D-nueva · La vista del cliente implementa el prototipo B2 aprobado por la agencia** (precisa D134). El prototipo se hace en paralelo a los spikes, y la galería de 1a no sale sin él. El visor con gestos se pule en 1b. **Por qué:** la galería es lo que ve el cliente de la agencia, y no se entrega con una vista provisional.
- **D-nueva · Dominio temporal `<slug>.focaldrop.com`** (precisa D7 y S5). Un subdominio por agencia (`platform_subdomain`), con una ruta comodín de Workers y un DNS comodín con proxy, hasta que la agencia tenga su dominio. El ZIP va en un host fijo de la plataforma, porque el certificado gratuito solo cubre un nivel de subdominio. **Por qué:** el link que recibe el cliente se ve profesional, y el DNS ya está en Cloudflare.
- **D-nueva · Respaldo nocturno desde el hito 1** (precisa D4). El workflow de D4 entra con la producción ligera; el simulacro de restauración sigue en el hito 3. **Por qué:** la BD de producción tiene datos reales desde el final de 1a, y Supabase Free no restaura a un punto en el tiempo.

## Historial

- 2026-11-26: **Especificación y plan del hito 1 → PR #109.**
  - **Entrevista con Rubén:** dónde vive la primera galería real, cómo salen los correos, el orden, la capacidad y el diseño B2. Después se resolvieron las tres preguntas abiertas de la especificación (dominio, respaldo y privacidad).
  - **Verificado en la documentación oficial:**
    - Workers acepta rutas comodín, pero las *Custom Domains* no;
    - el certificado gratuito cubre un solo nivel de subdominio;
    - R2 necesita `ETag` en el CORS para multipart y ya aborta solo las subidas incompletas a los 7 días;
    - Resend Free da 100 correos al día;
    - Uppy 6 firma todo con un solo `signRequest` y usa multipart solo arriba de 100 MiB, lo que cambia los nombres de endpoints de la Parte B §8;
    - `pg_net` está en beta y corta a los 2 s.
  - **Plan:** 30 features, unas 167 h (1a: 123 h; 1b: 44 h), unas 11 semanas a 15 h. La Parte C estimaba 140–170 h sin la producción ligera ni el respaldo.

- 2026-11-27: **Revisión de Fabian al plan.** Se aceptan sus 4 puntos:
  - H1-16 (acceso del cliente) depende de las vistas previas, y un archivo sin vista previa muestra un ícono;
  - los spikes S-5 y S-1 van por separado, con 4 h cada uno, y S-1 no necesita R2;
  - las rondas de la agencia sobre la galería tienen su propia feature (H1-19), para que no frenen el PR de H1-18;
  - el menú del celular sale de Clientes y es una feature de 2 h (H1-03).

  Quedan 30 features y unas 167 h.

## Tiempo

- Plan del hito 1 (R): sin estimado; real ≈ 2 h asistidas, con la entrevista y la verificación.

## Pendientes

- **Al mezclar:** crear las 30 issues en el milestone "Hito 1 · Entrega de galerías", con sus criterios (§10.3) y horas, y ponerlas en "Hito actual" en el orden del plan, debajo de #21, #25 y #27.
- **Cuentas que configura Rubén** (H1-01, H1-09 y H1-10): activar R2 con la tarjeta, el proyecto de Supabase de producción, el DNS comodín de `focaldrop.com` y Resend.
- **Agencia:** pedirle que su aviso de privacidad mencione que usa una plataforma para entregar las galerías (supuesto de la §9).
