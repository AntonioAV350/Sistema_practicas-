import { get, post, patch } from './http';

// Vacantes
export const abiertas = (params) => get('/vacantes', params);
export const elegibilidad = () => get('/vacantes/elegibilidad');
export const mias = () => get('/vacantes/mias');
export const todas = (params) => get('/vacantes/todas', params);
export const detalle = (id) => get(`/vacantes/${id}`);
export const crear = (datos) => post('/vacantes', datos);
export const actualizar = (id, datos) => patch(`/vacantes/${id}`, datos);
export const cambiarEstado = (id, estado) => patch(`/vacantes/${id}/estado`, { estado });

// Postulaciones
export const postulantes = (idVacante) => get(`/vacantes/${idVacante}/postulaciones`);
export const postular = (idVacante) => post(`/vacantes/${idVacante}/postulaciones`);
export const misPostulaciones = () => get('/vacantes/postulaciones/mias');
export const retirar = (id) => patch(`/vacantes/postulaciones/${id}/retirar`);
export const aceptar = (id) => post(`/vacantes/postulaciones/${id}/aceptar`);
export const descartar = (id) => patch(`/vacantes/postulaciones/${id}/descartar`);

// Aceptaciones
export const confirmar = (id) => post(`/vacantes/aceptaciones/${id}/confirmar`);
export const rechazar = (id) => patch(`/vacantes/aceptaciones/${id}/rechazar`);
export const cancelar = (id) => patch(`/vacantes/aceptaciones/${id}/cancelar`);
