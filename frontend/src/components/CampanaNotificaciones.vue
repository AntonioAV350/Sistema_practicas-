<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import OverlayBadge from 'primevue/overlaybadge';
import { useNotificacionesStore } from '../stores/notificaciones';

// Campana del encabezado: muestra cuántas notificaciones sin leer hay
// y lleva a la página de notificaciones del panel.
const props = defineProps({ ruta: { type: String, required: true } });
const router = useRouter();
const store = useNotificacionesStore();
let intervalo;

onMounted(() => {
  store.actualizarConteo();
  intervalo = setInterval(store.actualizarConteo, 60_000);
});
onBeforeUnmount(() => clearInterval(intervalo));
</script>

<template>
  <OverlayBadge v-if="store.noLeidas > 0" :value="store.noLeidas > 99 ? '99+' : store.noLeidas" severity="danger">
    <Button icon="pi pi-bell" text rounded aria-label="Notificaciones" @click="router.push(props.ruta)" />
  </OverlayBadge>
  <Button v-else icon="pi pi-bell" text rounded aria-label="Notificaciones" @click="router.push(props.ruta)" />
</template>
