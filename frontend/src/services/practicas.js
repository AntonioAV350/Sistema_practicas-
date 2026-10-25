import { get, post, patch, del, subir, abrirArchivo } from './http';

export const mias = () => get('/practicas/mias');
export const deOfertador = (params) => get('/practicas/ofertador', params);
export const listar = (params) => get('/practicas', params);
export const resumen = () => get('/practicas/resumen');
export const detalle = (id) => get(`/practicas/${id}`);

// Cierre
export const solicitarCierre = (id) => post(`/practicas/${id}/solicitar-cierre`);
export const proyectoCompletado = (id) => post(`/practicas/${id}/proyecto-completado`);
export const resolverCierre = (id, decision, observaciones) => post(`/practicas/${id}/cierre`, { decision, observaciones });

// Tareas
export const tareas = (id) => get(`/practicas/${id}/tareas`);
export const crearTarea = (id, datos) => post(`/practicas/${id}/tareas`, datos);
export const entregarEvidencia = (idTarea, archivo) => subir(`/practicas/tareas/${idTarea}/evidencias`, archivo);
export const revisarTarea = (idTarea, decision, comentario) => patch(`/practicas/tareas/${idTarea}/revision`, { decision, comentario });
export const verEvidencia = (idEvidencia) => abrirArchivo(`/practicas/evidencias/${idEvidencia}`);

// Carta de aceptación
export const generarCartaAceptacion = (id) => post(`/practicas/${id}/carta-aceptacion`);
export const verCartaAceptacion = (id) => abrirArchivo(`/practicas/${id}/carta-aceptacion/pdf`);

// Bitácora
export const bitacora = (id) => get(`/bitacora/practica/${id}`);
export const registrarBitacora = (id, datos) => post(`/bitacora/practica/${id}`, datos);
export const eliminarRegistro = (idRegistro) => del(`/bitacora/${idRegistro}`);
