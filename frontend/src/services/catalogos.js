import { get } from './http';

export const carreras = () => get('/catalogos/carreras');
export const tiposPractica = () => get('/catalogos/tipos-practica');
export const categoriasIncidencia = () => get('/catalogos/categorias-incidencia');
