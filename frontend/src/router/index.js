import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ROLES, SUBROLES, rutaPorRoles } from './roles';

const { ESTUDIANTE, OFERTADOR, ADMIN, SUPERADMIN } = ROLES;
const { ADMIN_ACADEMICO: ACA, ADMIN_DOCUMENTAL: DOC } = SUBROLES;

const v = {
  inicio: () => import('../views/comun/InicioView.vue'),
  notificaciones: () => import('../views/comun/NotificacionesView.vue'),
  // admin
  alumnos: () => import('../views/admin/AlumnosView.vue'),
  alumnoDetalle: () => import('../views/admin/AlumnoDetalleView.vue'),
  postulantes: () => import('../views/ofertador/PostulantesView.vue'),
  practicas: () => import('../views/admin/PracticasView.vue'),
  practicaDetalle: () => import('../views/comun/PracticaDetalleView.vue'),
};

// Vistas de administración que también usa el superadmin (tiene todo lo del admin)
function vistasAdmin() {
  return [
    { path: 'alumnos', component: v.alumnos, meta: { titulo: 'Alumnos' } },
    { path: 'alumnos/:id', component: v.alumnoDetalle, meta: { titulo: 'Detalle del alumno' } },
    {
      path: 'cartas',
      component: () => import('../views/admin/CartasView.vue'),
      meta: { titulo: 'Cartas de presentación', subroles: [DOC] },
    },
    { path: 'vacantes', component: () => import('../views/admin/VacantesView.vue'), meta: { titulo: 'Vacantes' } },
    { path: 'vacantes/:id', component: v.postulantes, meta: { titulo: 'Detalle de la vacante' } },
    { path: 'practicas', component: v.practicas, meta: { titulo: 'Prácticas' } },
    { path: 'practicas/:id', component: v.practicaDetalle, meta: { titulo: 'Detalle de la práctica' } },
    { path: 'cierres', component: v.practicas, meta: { titulo: 'Cierres', soloCierres: true, subroles: [ACA] } },
  ];
}

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
  { path: '/registro', name: 'registro', component: () => import('../views/auth/RegistroView.vue') },
  {
    path: '/alumno',
    component: () => import('../layouts/AlumnoLayout.vue'),
    meta: { requiresAuth: true, roles: [ESTUDIANTE] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
      { path: 'datos', component: () => import('../views/alumno/MisDatosView.vue'), meta: { titulo: 'Mis datos' } },
      { path: 'carta', component: () => import('../views/alumno/CartaView.vue'), meta: { titulo: 'Carta de presentación' } },
      { path: 'vacantes', component: () => import('../views/alumno/VacantesView.vue'), meta: { titulo: 'Vacantes' } },
      {
        path: 'postulaciones',
        component: () => import('../views/alumno/PostulacionesView.vue'),
        meta: { titulo: 'Mis postulaciones' },
      },
      { path: 'practica', component: () => import('../views/alumno/MiPracticaView.vue'), meta: { titulo: 'Mi práctica' } },
      { path: 'notificaciones', component: v.notificaciones, meta: { titulo: 'Notificaciones' } },
    ],
  },
  {
    path: '/ofertador',
    component: () => import('../layouts/OfertadorLayout.vue'),
    meta: { requiresAuth: true, roles: [OFERTADOR] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
      { path: 'vacantes', component: () => import('../views/ofertador/MisVacantesView.vue'), meta: { titulo: 'Mis vacantes' } },
      { path: 'vacantes/:id', component: v.postulantes, meta: { titulo: 'Postulantes' } },
      {
        path: 'practicantes',
        component: () => import('../views/ofertador/PracticantesView.vue'),
        meta: { titulo: 'Mis practicantes' },
      },
      { path: 'practicantes/:id', component: v.practicaDetalle, meta: { titulo: 'Practicante' } },
      { path: 'notificaciones', component: v.notificaciones, meta: { titulo: 'Notificaciones' } },
    ],
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: [ADMIN] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
      ...vistasAdmin(),
      { path: 'notificaciones', component: v.notificaciones, meta: { titulo: 'Notificaciones' } },
    ],
  },
  {
    path: '/superadmin',
    component: () => import('../layouts/SuperadminLayout.vue'),
    meta: { requiresAuth: true, roles: [SUPERADMIN] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
      { path: 'cuentas', component: () => import('../views/superadmin/CuentasView.vue'), meta: { titulo: 'Cuentas' } },
      { path: 'empresas', component: () => import('../views/superadmin/EmpresasView.vue'), meta: { titulo: 'Empresas' } },
      ...vistasAdmin(),
      { path: 'notificaciones', component: v.notificaciones, meta: { titulo: 'Notificaciones' } },
    ],
  },
  {
    path: '/bienvenida',
    name: 'bienvenida',
    component: () => import('../views/auth/BienvenidaView.vue'),
    meta: { requiresAuth: true, titulo: 'Bienvenido' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiere = (clave) => to.matched.flatMap((r) => r.meta[clave] ?? []);

  // Ruta protegida sin sesión: al login, recordando a dónde iba
  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // Con sesión no tiene sentido ver el login ni el registro
  if ((to.name === 'login' || to.name === 'registro') && auth.isAuthenticated) {
    return rutaPorRoles(auth.roles);
  }

  // Ruta de otro rol: a la vista que sí le corresponde
  const roles = requiere('roles');
  if (roles.length && !roles.some((r) => auth.roles.includes(r))) {
    return rutaPorRoles(auth.roles);
  }

  // Vistas de un subrol de ADMIN (el superadmin pasa siempre)
  const subroles = requiere('subroles');
  if (subroles.length && !auth.tieneSubrol(subroles)) {
    return rutaPorRoles(auth.roles);
  }
  return true;
});

export { ACA, DOC };
export default router;
