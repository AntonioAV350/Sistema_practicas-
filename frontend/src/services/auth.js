import { http } from './http';

// POST /api/auth/login
// Respuesta: { token, user: { id, nombre, apellidoPaterno, apellidoMaterno, email, roles: [{ rol, subrol }] } }
export async function loginRequest(email, password) {
  const { data } = await http.post('/auth/login', { email, password });
  return data;
}
