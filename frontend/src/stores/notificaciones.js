import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../services/notificaciones';

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const noLeidas = ref(0);

  async function actualizarConteo() {
    try {
      noLeidas.value = (await api.conteo()).noLeidas;
    } catch {
      // sin conexión: se intenta en el siguiente ciclo
    }
  }

  return { noLeidas, actualizarConteo };
});
