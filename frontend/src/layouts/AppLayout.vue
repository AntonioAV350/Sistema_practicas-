<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { useAuthStore } from '../stores/auth';
import { rol as etiquetaRol } from '../utils/formato';
import CampanaNotificaciones from '../components/CampanaNotificaciones.vue';
import CambiarPasswordDialog from '../components/CambiarPasswordDialog.vue';

// Esqueleto común de los 4 paneles: barra lateral con el menú del rol,
// encabezado con el título de la vista, campana de notificaciones y usuario.
const props = defineProps({
  menu: { type: Array, required: true },
  panel: { type: String, required: true },
  rutaNotificaciones: { type: String, required: true },
});

const auth = useAuthStore();
const route = useRoute();
const abierto = ref(false);
const menuUsuario = ref();
const mostrarPassword = ref(false);

const opciones = computed(() =>
  props.menu.filter((o) => !o.subroles || auth.tieneSubrol(o.subroles)),
);

// La opción activa es la de ruta más larga que coincide (para que "Inicio" no quede siempre marcada)
const activa = computed(() => {
  const coinciden = opciones.value.filter((o) => route.path === o.to || route.path.startsWith(o.to + '/'));
  return coinciden.sort((a, b) => b.to.length - a.to.length)[0]?.to;
});

const etiquetaUsuario = computed(() => {
  const r = auth.usuario?.roles?.[0];
  if (!r) return '';
  return etiquetaRol(r.subrol || r.rol);
});

const itemsUsuario = [
  { label: 'Cambiar contraseña', icon: 'pi pi-key', command: () => (mostrarPassword.value = true) },
  { separator: true },
  { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => auth.logout() },
];

watch(() => route.fullPath, () => (abierto.value = false));
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Fondo para cerrar el menú en móvil -->
    <div v-if="abierto" class="fixed inset-0 z-30 bg-black/30 lg:hidden" @click="abierto = false" />

    <aside
      class="fixed z-40 inset-y-0 left-0 w-64 bg-[#0b3a63] text-white flex flex-col transition-transform lg:translate-x-0 lg:static"
      :class="abierto ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <img src="/escudo_u.png" alt="" class="h-9 w-9 object-contain bg-white rounded-full p-0.5" />
        <div class="leading-tight">
          <div class="font-bold tracking-widest">SIGEAA</div>
          <div class="text-xs text-blue-200">{{ panel }}</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto py-3">
        <RouterLink
          v-for="o in opciones"
          :key="o.to"
          :to="o.to"
          class="flex items-center gap-3 px-5 py-2.5 text-sm text-blue-100 hover:bg-white/10 hover:text-white"
          :class="{ 'bg-white/15 !text-white font-semibold border-r-4 border-white': activa === o.to }"
        >
          <i :class="o.icon" class="text-base" />
          {{ o.label }}
        </RouterLink>
      </nav>
      <div class="px-5 py-3 text-xs text-blue-200 border-t border-white/10">
        © 2026 Universidad Autónoma de Chiapas
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <header class="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-8">
        <!-- el span lleva lg:hidden porque el display de PrimeVue le gana a la clase en el botón -->
        <span class="lg:hidden">
          <Button icon="pi pi-bars" text rounded aria-label="Abrir menú" @click="abierto = true" />
        </span>
        <h1 class="text-lg font-semibold text-slate-800 truncate flex-1">{{ route.meta.titulo }}</h1>
        <CampanaNotificaciones :ruta="rutaNotificaciones" />
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100"
          aria-haspopup="true"
          @click="menuUsuario.toggle($event)"
        >
          <span class="grid place-items-center h-9 w-9 rounded-full bg-[#0b3a63] text-white font-semibold">
            {{ (auth.usuario?.nombre || '?')[0] }}
          </span>
          <span class="hidden sm:flex flex-col items-start leading-tight">
            <span class="text-sm font-medium text-slate-800">{{ auth.nombreCompleto }}</span>
            <span class="text-xs text-slate-500">{{ etiquetaUsuario }}</span>
          </span>
          <i class="pi pi-angle-down text-slate-500" />
        </button>
        <Menu ref="menuUsuario" :model="itemsUsuario" popup />
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <!-- key: vistas reutilizadas por varias rutas (prácticas/cierres) se vuelven a montar -->
        <router-view :key="route.path" />
      </main>
    </div>

    <CambiarPasswordDialog v-model:visible="mostrarPassword" />
  </div>
</template>
