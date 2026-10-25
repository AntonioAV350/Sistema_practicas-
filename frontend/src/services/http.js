import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
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
    let code = error.response?.data?.error;
    // Las descargas piden blob: el JSON de error también llega como blob
    if (!code && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
        code = error.response.data.error;
      } catch {
        // no era JSON
      }
    }
    if (CODIGOS_SESION_INVALIDA.includes(code)) {
      const { useAuthStore } = await import('../stores/auth');
      await useAuthStore().expirarSesion();
    }
    return Promise.reject(error);
  },
);

// Atajos que devuelven directamente data
export const get = (url, params) => http.get(url, { params }).then((r) => r.data);
export const post = (url, body) => http.post(url, body).then((r) => r.data);
export const patch = (url, body) => http.patch(url, body).then((r) => r.data);
export const del = (url) => http.delete(url).then((r) => r.data);

// Sube un archivo como multipart (campo "archivo")
export function subir(url, archivo, extra = {}) {
  const form = new FormData();
  form.append('archivo', archivo);
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return http.post(url, form).then((r) => r.data);
}

// Descarga un archivo protegido (lleva token) y lo abre en otra pestaña
export async function abrirArchivo(url) {
  const ventana = window.open('', '_blank');
  try {
    const { data } = await http.get(url, { responseType: 'blob' });
    const objeto = URL.createObjectURL(data);
    if (ventana) ventana.location.href = objeto;
    else window.location.href = objeto;
    setTimeout(() => URL.revokeObjectURL(objeto), 60_000);
  } catch (e) {
    ventana?.close();
    throw e;
  }
}
