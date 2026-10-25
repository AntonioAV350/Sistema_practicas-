import { SUBROLES } from 'shared/constants';

// Menú lateral de cada panel. "subroles" limita la opción a esos subroles
// de ADMIN (el SUPERADMIN tiene su propio menú).
export const MENU_ALUMNO = [
  { label: 'Inicio', icon: 'pi pi-home', to: '/alumno' },
  { label: 'Mis datos', icon: 'pi pi-id-card', to: '/alumno/datos' },
  { label: 'Carta de presentación', icon: 'pi pi-file', to: '/alumno/carta' },
  { label: 'Vacantes', icon: 'pi pi-briefcase', to: '/alumno/vacantes' },
  { label: 'Mis postulaciones', icon: 'pi pi-send', to: '/alumno/postulaciones' },
  { label: 'Mi práctica', icon: 'pi pi-book', to: '/alumno/practica' },
  { label: 'Notificaciones', icon: 'pi pi-bell', to: '/alumno/notificaciones' },
];

export const MENU_OFERTADOR = [
  { label: 'Inicio', icon: 'pi pi-home', to: '/ofertador' },
  { label: 'Mis vacantes', icon: 'pi pi-briefcase', to: '/ofertador/vacantes' },
  { label: 'Mis practicantes', icon: 'pi pi-users', to: '/ofertador/practicantes' },
  { label: 'Incidencias y bajas', icon: 'pi pi-exclamation-circle', to: '/ofertador/incidencias' },
  { label: 'Notificaciones', icon: 'pi pi-bell', to: '/ofertador/notificaciones' },
];

const { ADMIN_ACADEMICO: ACA, ADMIN_DOCUMENTAL: DOC } = SUBROLES;

export const MENU_ADMIN = [
  { label: 'Inicio', icon: 'pi pi-home', to: '/admin' },
  { label: 'Cartas por revisar', icon: 'pi pi-file-check', to: '/admin/cartas', subroles: [DOC] },
  { label: 'Alumnos', icon: 'pi pi-users', to: '/admin/alumnos' },
  { label: 'Prácticas', icon: 'pi pi-book', to: '/admin/practicas' },
  { label: 'Cierres', icon: 'pi pi-check-square', to: '/admin/cierres', subroles: [ACA] },
  { label: 'Incidencias', icon: 'pi pi-exclamation-circle', to: '/admin/incidencias', subroles: [ACA] },
  { label: 'Bajas', icon: 'pi pi-user-minus', to: '/admin/bajas', subroles: [ACA] },
  { label: 'Vacantes', icon: 'pi pi-briefcase', to: '/admin/vacantes' },
  { label: 'Notificaciones', icon: 'pi pi-bell', to: '/admin/notificaciones' },
];

export const MENU_SUPERADMIN = [
  { label: 'Inicio', icon: 'pi pi-home', to: '/superadmin' },
  { label: 'Cuentas', icon: 'pi pi-user-edit', to: '/superadmin/cuentas' },
  { label: 'Empresas', icon: 'pi pi-building', to: '/superadmin/empresas' },
  { label: 'Bajas escaladas', icon: 'pi pi-user-minus', to: '/superadmin/bajas' },
  { label: 'Cartas', icon: 'pi pi-file-check', to: '/superadmin/cartas' },
  { label: 'Alumnos', icon: 'pi pi-users', to: '/superadmin/alumnos' },
  { label: 'Prácticas', icon: 'pi pi-book', to: '/superadmin/practicas' },
  { label: 'Cierres', icon: 'pi pi-check-square', to: '/superadmin/cierres' },
  { label: 'Incidencias', icon: 'pi pi-exclamation-circle', to: '/superadmin/incidencias' },
  { label: 'Vacantes', icon: 'pi pi-briefcase', to: '/superadmin/vacantes' },
  { label: 'Notificaciones', icon: 'pi pi-bell', to: '/superadmin/notificaciones' },
];
