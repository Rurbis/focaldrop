# ci(infra): keep supabase staging awake with a daily query

Issue: #22 · PR: (este) · Autor: Rubén

## Decisiones

- **D-nueva · Supabase de staging se mantiene activo con una consulta diaria desde GitHub Actions** (precisa D121 y D126) — El plan gratuito pausa un proyecto cuando pasa una semana sin "suficiente actividad de usuario en la BD"; según la [documentación](https://supabase.com/docs/guides/platform/free-project-pausing), basta con unas cuantas peticiones a la BD cada día. Staging pausado rompe el login, las previews de los PRs y, con la #16, las migraciones del deploy de la API; el 2026-10-22 ya estaba pausado. **Elegido el 2026-10-23** frente a reanudarlo a mano cada vez (cero trabajo, pero staging falla hasta que alguien lo nota) y frente al plan Pro (US$25 al mes, una excepción de costo sin ingresos todavía). `keep-supabase-awake.yml` corre todos los días a las 09:17 de la Ciudad de México, y también a mano. Hace un `select now()` con el secreto `DATABASE_URL` del Environment `staging`, con `deployment: false` para no registrar un deploy diario. Si la consulta falla, GitHub avisa por correo a quien cambió el horario por última vez. Supabase manda un correo de advertencia una semana antes de pausar; si llega, la consulta no basta y hay que cambiarla por una escritura. **Se quita** cuando staging pase a un plan de pago.

## Historial

- 2026-10-23: **Workflow diario contra la pausa de Supabase staging (D-nueva).** Una consulta al día a la BD de staging, sin registrar deploys. También estrena el secreto `DATABASE_URL`, que nadie había usado desde que se cargó el 2026-10-15 y que necesitará el deploy de la API (#16).

## Tiempo

≈ 0.4 h, con la revisión de la documentación de Supabase y de GitHub Actions.

## Pendientes

Al mezclar, correr el workflow a mano (`gh workflow run keep-supabase-awake.yml`) y confirmar que pasa.
