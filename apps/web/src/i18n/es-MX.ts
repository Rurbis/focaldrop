/**
 * Every interface text of the web app, in Spanish (Mexico) (B5).
 *
 * Components read texts from here instead of writing them inline, so a missing
 * or misspelled key is a compile error and wording changes happen in one place.
 * No agency text lives here: names, slogans and the like come from the database.
 */
export const t = {
  platform: {
    name: 'Focal Drop',
  },
  home: {
    description: 'Sitios y galerías privadas para agencias de fotografía.',
  },
  admin: {
    nav: {
      label: 'Navegación del panel',
      home: 'Inicio',
    },
    home: {
      title: 'Inicio',
      placeholder: 'Aquí verás el resumen de tu agencia y de tus galerías.',
    },
    signOut: 'Salir',
  },
  auth: {
    fields: {
      email: 'Correo electrónico',
      password: 'Contraseña',
      newPassword: 'Contraseña nueva',
      confirmPassword: 'Confirma la contraseña nueva',
    },
    login: {
      title: 'Iniciar sesión',
      intro: 'Entra al panel de tu agencia.',
      submit: 'Entrar',
      submitting: 'Entrando…',
      forgotLink: '¿Olvidaste tu contraseña?',
    },
    forgot: {
      title: 'Recuperar contraseña',
      intro: 'Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.',
      submit: 'Enviar enlace',
      submitting: 'Enviando…',
      sent: 'Si el correo está registrado, te enviamos un enlace. Revisa tu bandeja de entrada.',
      backToLogin: 'Volver a iniciar sesión',
    },
    reset: {
      title: 'Elige una contraseña nueva',
      intro:
        'Usa al menos 8 caracteres. Una frase larga es más segura que una palabra con símbolos.',
      submit: 'Guardar contraseña',
      submitting: 'Guardando…',
    },
    errors: {
      invalidEmail: 'Escribe un correo electrónico válido.',
      missingPassword: 'Escribe tu contraseña.',
      invalidCredentials: 'El correo o la contraseña no son correctos.',
      emailNotConfirmed: 'Tu correo todavía no está confirmado.',
      tooManyRequests: 'Hiciste demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
      passwordTooLong: 'La contraseña es demasiado larga.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      weakPassword: 'Esa contraseña es demasiado débil. Elige una más larga o menos común.',
      samePassword: 'La contraseña nueva debe ser distinta de la anterior.',
      linkInvalid: 'El enlace no es válido o ya venció. Pide uno nuevo.',
      unexpected: 'Algo salió mal. Vuelve a intentarlo en un momento.',
    },
  },
} as const;
