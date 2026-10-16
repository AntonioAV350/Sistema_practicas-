import { get, post, patch } from './http';

export const listar = (params) => get('/cuentas', params);
export const crearAdmin = (datos) => post('/cuentas/admins', datos);
export const crearOfertador = (datos) => post('/cuentas/ofertadores', datos);
export const actualizar = (id, datos) => patch(`/cuentas/${id}`, datos);
export const cambiarActivo = (id, activo) => patch(`/cuentas/${id}/activo`, { activo });
export const restablecerPassword = (id, password) => patch(`/cuentas/${id}/password`, { password });

export const empresas = () => get('/cuentas/empresas');
export const crearEmpresa = (datos) => post('/cuentas/empresas', datos);
export const actualizarEmpresa = (id, datos) => patch(`/cuentas/empresas/${id}`, datos);
