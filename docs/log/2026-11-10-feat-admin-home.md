# feat(web): show the signed-in member and their agency on the panel's home

Issue: #12 · PR: #89 · Autor: Rubén

## Decisiones

- **D-nueva · Tras iniciar sesión, el formulario abre el panel desde el navegador; la acción no usa `redirect()`** (precisa D133). Next resuelve un `redirect()` dentro de una Server Action pidiendo la página destino por su cuenta. En `next dev` y `next start`, esa petición llega con `localhost` como host, y el panel cargaba la agencia de otro host: se reprodujo al entrar por `beta.localhost` con una cuenta de otra agencia. Al recargar se corregía. En el Worker, según su código, OpenNext usa como origen el de la petición real; no se probó ahí, y el panel no debe depender de ese detalle. Por eso `signIn` y `updatePassword` responden `signed-in`, y el formulario navega con `router.replace('/admin')`. Esa petición sale del navegador, con su host real.

## Historial

- 2026-11-10: **F3, parte web → PR #89: el inicio del panel con el perfil y la agencia (#12).** El Server Component pide `GET /admin/me` a Nest de servidor a servidor (D62), con el token verificado y el host de la petición. Muestra cinco estados:
  - **listo:** saludo con el nombre, la agencia y el rol;
  - **cargando:** `loading.tsx`, mientras Nest responde o Cloud Run despierta;
  - **sin acceso:** 403;
  - **error temporal:** con "Reintentar";
  - **sesión rechazada:** un 401 de Nest lleva a `/admin/login?error=session`, que no rebota a `/admin`.

  Probado en local con Supabase real: listo (también en celular), sin acceso con una cuenta de otra agencia, error temporal con la API detenida y la página de `?error=session`. El estado de carga y el 401 de Nest solo se cubren con pruebas unitarias. Los textos van en el diccionario `es-MX`.

## Tiempo

- #12 F3, parte web (R): estimado 2 h; real ≈ 1.5 h hasta el PR.

## Pendientes

- **Rubén aprobó la pantalla como funcional el 2026-11-10**, en la preview, incluidos los nombres de rol "Titular" y "Equipo". El diseño final llega con la A3 (#53). Falta la opinión de Fabian sobre esos nombres.
- **Las pantallas con la marca** (A3, #53) cambian el encabezado y la navegación; esta página ya usa los componentes y tokens de A2.
- **La primera visita tras un rato sin uso** puede tardar o dar un error temporal mientras Cloud Run despierta. Falta medirlo.
