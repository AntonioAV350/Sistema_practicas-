import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
});

// Agrega el JWT a cada petición
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('sigea_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Códigos que manda el backend cuando el token ya no sirve (SIGEA-18)
const CODIGOS_SESION_INVALIDA = ['TOKEN_EXPIRED', 'TOKEN_INVALID'];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const code = error.response?.data?.error;
    if (CODIGOS_SESION_INVALIDA.includes(code)) {
      const { useAuthStore } = await import('../stores/auth');
      await useAuthStore().expirarSesion();
    }
    return Promise.reject(error);
  },
);
