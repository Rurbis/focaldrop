# fix(api): reject compressed request bodies and keep parser errors out of sentry

Issue: — · PR: (este) · Autor: Rubén

## Decisiones

- **D-nueva · La API no descomprime cuerpos de petición** (precisa D57 y D86) — Los *parsers* de JSON y urlencoded van con `inflate: false`: un `Content-Encoding` distinto de `identity` recibe 415, sin que `node:zlib` llegue a tocar los datos. **Por qué:** nadie le manda cuerpos comprimidos a la API (el navegador habla con Next, que reenvía JSON plano, D62), y en octubre de 2026 ese camino tuvo dos avisos: `body-parser` [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) y el descompresor Brotli de Node.js (CVE-2026-111497). Es defensa en profundidad: además de tener las versiones parchadas (#72, #73), la API ya no pasa por ese código. Si algún día hace falta aceptar cuerpos comprimidos (por ejemplo, subidas grandes), se decide entonces y con un límite propio.

## Historial

- 2026-10-26: **API: cuerpos comprimidos → 415, y errores del *parser* fuera de Sentry → PR.** La configuración HTTP pasa a `configureApp()` en `src/bootstrap.ts`, que usan el servidor y las pruebas e2e. **Hallazgo:** Nest ya convierte el JSON malformado en `BadRequestException`, pero los demás rechazos de `body-parser` (413 por cuerpo de más de 100 KB y el 415 nuevo) llegaban como `http-errors`, y el filtro global de Sentry los reportaba como fallas del servidor. Cualquiera podía gastar la cuota gratuita de Sentry con peticiones basura. Un *middleware* de error justo después de los *parsers* los convierte en `HttpException`: la respuesta queda igual (`{"statusCode":415,"message":"content encoding unsupported"}`) y Sentry los trata como errores esperados del cliente. Las pruebas e2e nuevas fallan sin cada parte del cambio. Apagan la integración `Dedupe` de Sentry, que descarta un evento igual al anterior y ocultaría un segundo reporte.

## Tiempo

≈ 0.75 h, incluida la investigación del filtro de Sentry.
