# ADR-0003: Supabase Auth para la identidad, Nest valida el JWT y la API automática de Supabase queda apagada

- Estado: aceptada · Fecha: 2026-10-09 · Reemplaza: — · Origen: D57, D60, D121, D133

## Contexto

El panel necesita login con correo y contraseña (y Google más adelante), recuperación de contraseña, invitaciones y registro solo por invitación. Escribir eso a mano es caro y arriesgado. Al mismo tiempo, la regla de ADR-0002 es que Nest decide los permisos y que nada más toca los datos. Supabase trae Auth, pero también una API REST automática sobre la base de datos (la Data API), que se saltaría a Nest.

## Decisión

- **Supabase Auth maneja la identidad** (D57): contraseñas, recuperación, sesiones e invitaciones.
- **Nest valida el JWT con las llaves públicas** del proyecto (JWKS), sin conocer secretos. El JWT se firma con **ES256** (llave asimétrica, D121). Nest revisa firma, vencimiento y audiencia, y aplica membresía y rol en *guards* (#12).
- **Solo llaves nuevas** (D121): la publicable (`sb_publishable_…`) y las secretas (`sb_secret_…`). Las *legacy* `anon` y `service_role` están desactivadas.
- **La Data API está apagada** (D60, D121) y RLS está activo en todas las tablas, sin políticas para `anon` ni `authenticated`: ni con la llave publicable se leen datos. Nest se conecta directo a Postgres con su rol `app_api` (ADR-0001).
- **El front usa Supabase solo desde el servidor** (D133): *Server Actions* para entrar, salir y recuperar, y la sesión en una cookie `HttpOnly`. `proxy.ts` solo refresca la sesión, y el panel la verifica con `getClaims()`. La recuperación usa `token_hash` y una ruta propia (`/admin/auth/confirm`), y responde igual exista o no la cuenta.

Detalle: [Parte A §3](../phase-1a-architecture.md) y la bitácora (D57, D60, D121 y D133).

## Consecuencias

**Positivas**

- Contraseñas, *hashes* y sesiones son problema de Supabase, no nuestro.
- Nest verifica sin secretos compartidos; rotar la llave de firma no toca la API.
- Con la Data API apagada, la única puerta a los datos es Nest.

**Negativas**

- Dependemos de Supabase para la identidad. Migrar a otro proveedor implica mover cuentas y sesiones.
- Supabase solo deja editar sus correos (recuperación, invitación) con un SMTP propio. Hasta configurarlo con Resend, la recuperación de staging no usa nuestra plantilla (#71).

**Riesgos**

- Que alguien encienda la Data API por error. Mitigación: RLS sin políticas para los roles públicos es el segundo candado.
- Una caída de Supabase deja sin login. Mitigación: es la misma dependencia que la base de datos; se acepta en el MVP.

## Alternativas descartadas

| Opción                                   | Por qué no                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Auth propia en Nest (Passport + bcrypt)  | Más código sensible que mantener: recuperación, invitaciones, límites de intentos.   |
| Clerk o Auth0                            | Otro proveedor y otra cuenta; Supabase ya está en el stack y su plan gratuito basta. |
| Usar la Data API desde el front          | Las reglas quedarían repartidas entre RLS y Nest, contra ADR-0002.                   |
