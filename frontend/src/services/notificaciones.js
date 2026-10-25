import { get, patch } from './http';

export const listar = (params) => get('/notificaciones', params);
export const conteo = () => get('/notificaciones/conteo');
export const marcarLeida = (id) => patch(`/notificaciones/${id}/leida`);
export const marcarTodas = () => patch('/notificaciones/leidas');
