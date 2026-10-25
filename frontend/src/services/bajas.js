import { get, post, patch } from './http';

export const listar = (params) => get('/bajas', params);
export const solicitar = (datos) => post('/bajas', datos);
export const atender = (id, decision, nota) => patch(`/bajas/${id}/atender`, { decision, nota });
export const decidir = (id, decision, comentario) => patch(`/bajas/${id}/decidir`, { decision, comentario });
