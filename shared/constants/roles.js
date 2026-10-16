// Claves tal como están en core.roles / core.subroles (seed.sql)
export const ROLES = Object.freeze({
  ESTUDIANTE: 'ESTUDIANTE',
  OFERTADOR: 'OFERTADOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
});

export const SUBROLES = Object.freeze({
  ADMIN_ACADEMICO: 'ADMIN_ACADEMICO',
  ADMIN_DOCUMENTAL: 'ADMIN_DOCUMENTAL',
});

export const ETIQUETA_ROL = Object.freeze({
  ESTUDIANTE: 'Alumno',
  OFERTADOR: 'Ofertador',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Superadministrador',
  ADMIN_ACADEMICO: 'Administrador Académico',
  ADMIN_DOCUMENTAL: 'Administrador Documental',
});
