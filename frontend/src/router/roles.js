// PENDIENTE: mover ROLES a shared/constants cuando el equipo lo defina.
export const ROLES = {
  ESTUDIANTE: 'ESTUDIANTE',
  OFERTADOR: 'OFERTADOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
};

export const RUTA_POR_ROL = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.ADMIN]: '/admin',
  [ROLES.OFERTADOR]: '/ofertador',
  [ROLES.ESTUDIANTE]: '/alumno',
};

// Para roles sin vista definida
export const RUTA_BIENVENIDA = '/bienvenida';

// Si un usuario tiene varios roles, se usa el de mayor jerarquía
const PRIORIDAD = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.OFERTADOR, ROLES.ESTUDIANTE];

export function rutaPorRoles(roles = []) {
  const rol = PRIORIDAD.find((r) => roles.includes(r));
  return rol ? RUTA_POR_ROL[rol] : RUTA_BIENVENIDA;
}
