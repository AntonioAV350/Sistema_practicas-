import { get, patch } from './http';

export const miPerfil = () => get('/alumnos/me');
export const actualizarMisDatos = (datos) => patch('/alumnos/me', datos);
export const listar = (params) => get('/alumnos', params);
export const detalle = (id) => get(`/alumnos/${id}`);
