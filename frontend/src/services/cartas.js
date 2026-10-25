import { get, post, patch, subir, abrirArchivo } from './http';

export const misCartas = () => get('/cartas/mias');
export const generar = () => post('/cartas');
export const subirEscaneo = (id, archivo) => subir(`/cartas/${id}/escaneo`, archivo);
export const verPdf = (id) => abrirArchivo(`/cartas/${id}/pdf`);
export const verEscaneo = (id) => abrirArchivo(`/cartas/${id}/escaneo`);
export const listar = (params) => get('/cartas', params);
export const revisar = (id, decision, comentarios) => patch(`/cartas/${id}/revision`, { decision, comentarios });
