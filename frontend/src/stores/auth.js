import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ROLES } from 'shared/constants';
import { loginRequest, refreshRequest } from '../services/auth';
import { rutaPorRoles } from '../router/roles';

const TOKEN_KEY = 'sigea_token';
const USER_KEY = 'sigea_usuario';
// Se renueva el token cuando le quedan menos de 10 minutos
const MARGEN_REFRESH_MS = 10 * 60 * 1000;

function expiracionDelToken(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const usuario = ref(null);
  let temporizador = null;

  const isAuthenticated = computed(() => !!token.value);
  const roles = computed(() => (usuario.value?.roles ?? []).map((r) => r.rol));
  const subroles = computed(() => (usuario.value?.roles ?? []).map((r) => r.subrol).filter(Boolean));
  const esSuperadmin = computed(() => roles.value.includes(ROLES.SUPERADMIN));
  const nombreCompleto = computed(() => {
    const u = usuario.value;
    if (!u) return '';
    return [u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ');
  });

  // ¿Tiene alguno de estos subroles? El SUPERADMIN cuenta como todos.
  const tieneSubrol = (...lista) => esSuperadmin.value || lista.flat().some((s) => subroles.value.includes(s));

  function programarRefresh() {
    clearTimeout(temporizador);
    const exp = token.value && expiracionDelToken(token.value);
    if (!exp) return;
    const espera = Math.max(exp - Date.now() - MARGEN_REFRESH_MS, 5_000);
    temporizador = setTimeout(renovar, espera);
  }

  async function renovar() {
    if (!token.value) return;
    try {
      const data = await refreshRequest();
      setSession(data.token, data.user);
    } catch {
      // si falla, el interceptor de http ya manda al login cuando expire
    }
  }

  function setSession(newToken, newUser) {
    token.value = newToken;
    usuario.value = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    programarRefresh();
  }

  function restoreSession() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (!savedToken || !savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      if (!parsed || !Array.isArray(parsed.roles)) throw new Error('Sesión guardada inválida');
      const exp = expiracionDelToken(savedToken);
      if (exp && exp <= Date.now()) throw new Error('Token vencido');
      token.value = savedToken;
      usuario.value = parsed;
      programarRefresh();
    } catch {
      clearSession();
    }
  }

  function clearSession() {
    clearTimeout(temporizador);
    token.value = null;
    usuario.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Cuando el usuario edita su nombre, etc.
  function actualizarUsuario(cambios) {
    usuario.value = { ...usuario.value, ...cambios };
    localStorage.setItem(USER_KEY, JSON.stringify(usuario.value));
  }

  async function logout() {
    clearSession();
    const { default: router } = await import('../router');
    await router.push('/login');
  }

  // Se usa cuando el backend responde TOKEN_EXPIRED / TOKEN_INVALID
  async function expirarSesion() {
    if (!token.value) return;
    clearSession();
    const { default: router } = await import('../router');
    await router.push({ name: 'login', query: { expirada: '1' } });
  }

  async function iniciarSesion(newToken, newUser) {
    setSession(newToken, newUser);
    const { default: router } = await import('../router');

    // Si venía de una ruta protegida regresa ahí (solo rutas internas)
    const redirect = router.currentRoute.value.query.redirect;
    const destino =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : rutaPorRoles(roles.value);

    await router.push(destino);
  }

  async function login(email, password) {
    const data = await loginRequest(email, password);
    await iniciarSesion(data.token, data.user);
  }

  return {
    token,
    usuario,
    roles,
    subroles,
    esSuperadmin,
    nombreCompleto,
    isAuthenticated,
    tieneSubrol,
    setSession,
    restoreSession,
    clearSession,
    actualizarUsuario,
    logout,
    expirarSesion,
    iniciarSesion,
    login,
  };
});
