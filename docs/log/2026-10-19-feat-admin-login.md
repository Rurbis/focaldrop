# feat(web): add admin login, logout and password recovery with supabase ssr

Issue: #18 · PR: #49 · Autor: Rubén

Nota convertida de las filas que este PR agregaba a la bitácora (D138). Sus D# ya estaban reservadas porque otros documentos las citan.

## Decisiones

- **D133** · **Acceso al panel: Supabase solo desde el servidor, cookie `httpOnly` y recuperación con `token_hash`** (precisa D29, D40, D57 y D94) — Login con correo y contraseña por *Server Actions* (#18). **Sin cliente de Supabase en el navegador:** todo pasa por el servidor de Next, así que la cookie de sesión va `HttpOnly` (un script inyectado no puede leerla), `SameSite=Lax` y `Secure` fuera de local; Supabase la deja legible por defecto porque su cliente del navegador la necesita. **`proxy.ts` solo refresca la sesión** (D40) y solo en `/admin/*`: el sitio público no paga el costo de la autenticación. El layout `(panel)` exige sesión con `getClaims()`, que verifica el JWT ES256 en local, sin llamada de red; los permisos los decide Nest. **Recuperar contraseña:** plantilla propia en español con `token_hash` y `verifyOtp` en `/admin/auth/confirm`, en lugar del enlace PKCE por defecto, para que funcione aunque se abra en otro dispositivo. El destino es fijo, sin parámetro `next`, así que no hay redirección abierta. El formulario responde igual exista o no la cuenta. **Contraseñas:** mínimo 8 caracteres (NIST SP 800-63B) y máximo 72 bytes (bcrypt ignora el resto). Salir cierra solo la sesión de ese navegador. **Pendiente para staging y producción:** la misma plantilla de recuperación en Auth y `site_url` con la URL del front (#22).

## Historial

- 2026-10-19: **#18 → PR #49:** login del panel, salir y recuperar contraseña con Supabase SSR (D133). Probado en el navegador integrado con un usuario sintético: redirección sin sesión, errores en español, login, salir, cookie `HttpOnly`, enlace de recuperación desde Mailpit (que también funciona sin cookies y es de un solo uso) y contraseña nueva. Las pruebas unitarias encontraron un error real: un código como `toString` devolvía una función heredada; se corrigió con un `Map`.
- 2026-10-20: **Revisión de Fabian al PR #49:** recuperar contraseña podía revelar si una cuenta existe, porque Supabase responde con un límite por usuario o un error de envío solo para correos registrados. Ahora todo resultado devuelve el mismo mensaje neutro, el motivo queda en el log del servidor sin el correo, y hay pruebas de la acción para los tres casos.

## Tiempo

- #18 Login del panel (R): estimado 4 h, real ≈ 2 h hasta el PR. Incluye revisar la documentación de Supabase SSR y de Next 16, la plantilla de recuperación, Vitest en la web y la prueba completa en el navegador integrado.
