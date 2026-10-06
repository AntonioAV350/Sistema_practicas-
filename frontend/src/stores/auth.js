import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { loginRequest } from '../services/auth';
import { rutaPorRoles } from '../router/roles';

const TOKEN_KEY = 'sigea_token';
const USER_KEY = 'sigea_usuario';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const usuario = ref(null);

  const isAuthenticated = computed(() => !!token.value);
  const roles = computed(() => (usuario.value?.roles ?? []).map((r) => r.rol));
  const subroles = computed(() => (usuario.value?.roles ?? []).map((r) => r.subrol).filter(Boolean));
  const nombreCompleto = computed(() => {
    const u = usuario.value;
    if (!u) return '';
    return [u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ');
  });

  function setSession(newToken, newUser) {
    token.value = newToken;
    usuario.value = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }

  function restoreSession() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (!savedToken || !savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      if (!parsed || !Array.isArray(parsed.roles)) throw new Error('Sesión guardada inválida');
      token.value = savedToken;
      usuario.value = parsed;
    } catch {
      clearSession();
    }
  }

  function clearSession() {
    token.value = null;
    usuario.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function logout() {
    clearSession();
    const { default: router } = await import('../router');
    await router.push('/login');
  }

  // Se usa cuando el backend responde TOKEN_EXPIRED / TOKEN_INVALID
  async function expirarSesion() {
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
    nombreCompleto,
    isAuthenticated,
    setSession,
    restoreSession,
    clearSession,
    logout,
    expirarSesion,
    iniciarSesion,
    login,
  };
});
