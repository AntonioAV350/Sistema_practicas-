import { http, get, post, patch } from './http';

// POST /api/auth/login
// Respuesta: { token, user: { id, nombre, apellidoPaterno, apellidoMaterno, email, roles: [{ rol, subrol }] } }
export async function loginRequest(email, password) {
  const { data } = await http.post('/auth/login', { email, password });
  return data;
}

// POST /api/auth/refresh -> { token, user }
export const refreshRequest = () => post('/auth/refresh');

// POST /api/auth/registro (alumno se registra solo) -> { token, user }
export const registrarAlumno = (datos) => post('/auth/registro', datos);

export const miUsuario = () => get('/auth/me');

export const cambiarPassword = (actual, nueva) => patch('/auth/password', { actual, nueva });
