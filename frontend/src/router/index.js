import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ROLES, rutaPorRoles } from './roles';

// Mientras no existan las vistas reales, cada rol apunta a la pantalla genérica.
// Cuando una vista esté lista, solo se cambia el component de su ruta.
const Bienvenida = () => import('../views/auth/BienvenidaView.vue');

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
  },
  {
    path: '/alumno',
    name: 'alumno',
    component: Bienvenida,
    meta: { requiresAuth: true, roles: [ROLES.ESTUDIANTE], titulo: 'Panel del alumno' },
  },
  {
    path: '/ofertador',
    name: 'ofertador',
    component: Bienvenida,
    meta: { requiresAuth: true, roles: [ROLES.OFERTADOR], titulo: 'Panel del ofertador' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: Bienvenida,
    meta: { requiresAuth: true, roles: [ROLES.ADMIN], titulo: 'Panel del administrador' },
  },
  {
    path: '/superadmin',
    name: 'superadmin',
    component: Bienvenida,
    meta: { requiresAuth: true, roles: [ROLES.SUPERADMIN], titulo: 'Panel del superadministrador' },
  },
  {
    path: '/bienvenida',
    name: 'bienvenida',
    component: Bienvenida,
    meta: { requiresAuth: true, titulo: 'Bienvenido' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  // Ruta protegida sin sesión: al login, recordando a dónde iba
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // Con sesión no tiene sentido ver el login
  if (to.name === 'login' && auth.isAuthenticated) {
    return rutaPorRoles(auth.roles);
  }

  // Ruta de otro rol: a la vista que sí le corresponde
  const permitidos = to.meta.roles;
  if (permitidos && !permitidos.some((r) => auth.roles.includes(r))) {
    return rutaPorRoles(auth.roles);
  }
});

export default router;
