# ADR-0013: Observabilidad y protección de costos desde el hito 0

- Estado: aceptada · Fecha: 2026-10-11 · Reemplaza: — · Origen: D86, D87, D123, D124, D131

## Contexto

La agencia va a usar la plataforma de verdad, y somos dos personas con poco tiempo: un error que nadie ve, o una factura inesperada, cuestan más que prevenirlos. Todo corre en planes gratuitos (D1), donde un descuido (instancias que escalan, un ataque que dispara peticiones) puede generar cobros. La observabilidad tampoco puede filtrar datos personales de los clientes de la agencia.

## Decisión

**Observabilidad (D86):**

- **Sentry**, plan gratuito, con proyectos `api`, `web` y `zip-worker`. Sus términos permiten un solo usuario, así que solo Rubén entra (D123). Solo errores, sin trazas de rendimiento ni Session Replay.
- **Sin datos personales:** la API y la web desactivan datos de usuario, cookies, encabezados, cuerpos y *query strings* (`dataCollection`), y el proyecto no guarda IP.
- **En el front, solo el navegador** (#76): el SDK de servidor de Sentry rebasaba el límite de 3 MiB del Worker gratuito. Los errores del servidor quedan en Workers Logs de Cloudflare.
- **Errores esperados fuera de Sentry:** los 4xx del cliente (por ejemplo, cuerpos demasiado grandes o comprimidos) no se reportan, para que nadie agote la cuota con peticiones basura (#74).
- **UptimeRobot** (gratis, cada 5 minutos) sobre el sitio y la API. Las alertas llegan al correo de la plataforma.

**Protección de costos (D87, D124):**

- **Google Cloud:** cuenta de pago (no la prueba de 90 días), `max-instances` 2 y sin `min-instances`, presupuesto con alertas al 50, 90 y 100 %, y un **corte automático** (`billing-guard`) que desconecta la facturación al pasarse.
- **Cloudflare:** alerta de facturación cuando se active R2; el Worker tiene un presupuesto de tamaño en CI (2.75 MiB).
- **Dependencias** (D131): Dependabot espera 14 días antes de proponer versiones nuevas, salvo las de seguridad.

## Consecuencias

**Positivas**

- Nos enteramos de un error o de una caída antes que la agencia.
- El peor caso de costo en Google Cloud queda acotado a unos pocos dólares.
- Ningún evento lleva datos personales.

**Negativas**

- Una sola persona ve Sentry; la otra depende de las alertas por correo.
- Los errores del servidor del front están en otro lugar (Workers Logs).
- El corte automático apaga la API si se rebasa el presupuesto.

**Riesgos**

- Agotar la cuota gratuita de Sentry (5,000 errores al mes). Mitigación: solo errores inesperados.
- El presupuesto avisa con horas de retraso. Mitigación: `max-instances` acota el gasto mientras tanto.

## Alternativas descartadas

| Opción                               | Por qué no                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Solo los logs de cada plataforma     | Nadie los revisa a diario; sin alertas, los errores pasan desapercibidos.      |
| Sentry Team (US$26 al mes)           | Fuera de presupuesto hasta que haya ingresos.                                  |
| Workers Paid para Sentry en servidor | US$5 al mes; se reconsidera al lanzar o si el Worker crece.                    |
