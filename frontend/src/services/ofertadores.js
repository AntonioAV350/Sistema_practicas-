import { get, patch } from './http';

export const miPerfil = () => get('/ofertadores/me');
export const actualizarMiPerfil = (datos) => patch('/ofertadores/me', datos);
export const listar = () => get('/ofertadores');
