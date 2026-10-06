import { isAxiosError } from 'axios';

export const MSG_CREDENCIALES = 'Correo o contraseña incorrectos.';
export const MSG_CUENTA_INACTIVA = 'Tu cuenta está desactivada. Contacta a un administrador.';
export const MSG_VALIDACION = 'Revisa tu correo y contraseña.';
export const MSG_CONEXION = 'No se pudo conectar, intenta de nuevo.';
export const MSG_SESION_EXPIRADA = 'Tu sesión expiró, inicia sesión de nuevo.';
export const MSG_INESPERADO = 'Ocurrió un error inesperado, intenta de nuevo.';

// Traduce los errores del backend (SIGEA-7) a mensajes para el usuario.
export function mensajeErrorLogin(error) {
  if (!isAxiosError(error)) return MSG_INESPERADO;

  const status = error.response?.status;
  const code = error.response?.data?.error;

  if (!error.response || status >= 500) return MSG_CONEXION;
  if (code === 'INVALID_CREDENTIALS' || status === 401) return MSG_CREDENCIALES;
  if (code === 'ACCOUNT_INACTIVE') return MSG_CUENTA_INACTIVA;
  if (code === 'VALIDATION_ERROR') return MSG_VALIDACION;

  return MSG_INESPERADO;
}
