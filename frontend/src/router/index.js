import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ROLES, SUBROLES, rutaPorRoles } from './roles';

const { ESTUDIANTE, OFERTADOR, ADMIN, SUPERADMIN } = ROLES;
const { ADMIN_ACADEMICO: ACA, ADMIN_DOCUMENTAL: DOC } = SUBROLES;

const v = {
  inicio: () => import('../views/comun/InicioView.vue'),
  notificaciones: () => import('../views/comun/NotificacionesView.vue'),
};

// Vistas de administración que también usa el superadmin (tiene todo lo del admin)
function vistasAdmin() {
  return [];
}

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
  {
    path: '/alumno',
    component: () => import('../layouts/AlumnoLayout.vue'),
    meta: { requiresAuth: true, roles: [ESTUDIANTE] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
      { path: 'notificaciones', component: v.notificaciones, meta: { titulo: 'Notificaciones' } },
    ],
  },
  {
    path: '/ofertador',
    component: () => import('../layouts/OfertadorLayout.vue'),
    meta: { requiresAuth: true, roles: [OFERTADOR] },
    children: [
      { path: '', component: v.inicio, meta: { titulo: 'Inicio' } },
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
