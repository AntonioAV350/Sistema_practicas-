import { get, post, patch } from './http';

export const listar = (params) => get('/incidencias', params);
export const registrar = (datos) => post('/incidencias', datos);
export const resolver = (id, resolucion) => patch(`/incidencias/${id}/resolver`, { resolucion });
