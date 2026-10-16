<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Encabezado from '../../components/Encabezado.vue';
import Vacio from '../../components/Vacio.vue';
import * as api from '../../services/notificaciones';
import { useNotificacionesStore } from '../../stores/notificaciones';
import { useAviso } from '../../composables/useAviso';
import { fechaHora } from '../../utils/formato';

// Misma vista para los 4 paneles; el destino de cada notificación depende del panel.
const route = useRoute();
const router = useRouter();
const store = useNotificacionesStore();
const { error } = useAviso();

const lista = ref([]);
const cargando = ref(true);
const filtro = ref('Todas');
const panel = computed(() => route.path.split('/')[1]); // alumno | ofertador | admin | superadmin

async function cargar() {
  cargando.value = true;
  try {
    lista.value = await api.listar({ soloNoLeidas: filtro.value === 'Sin leer', limite: 100 });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

// A dónde lleva cada notificación según su entidad y el panel actual
function destino(n) {
  const base = `/${panel.value}`;
  const porEntidad = {
    alumno: { carta: '/carta', aceptacion: '/postulaciones', practica: '/practica', baja: '/practica' },
    ofertador: {
      practica: n.idEntidad ? `/practicantes/${n.idEntidad}` : '/practicantes',
      aceptacion: '/vacantes',
      vacante: n.idEntidad ? `/vacantes/${n.idEntidad}` : '/vacantes',
      baja: '/incidencias',
      incidencias: '/incidencias',
      incidencia: '/incidencias',
    },
    admin: {
      carta: '/cartas',
      practica: n.idEntidad ? `/practicas/${n.idEntidad}` : '/practicas',
      baja: '/bajas',
      incidencias: '/incidencias',
      incidencia: '/incidencias',
    },
    superadmin: {
      carta: '/cartas',
      practica: n.idEntidad ? `/practicas/${n.idEntidad}` : '/practicas',
      baja: '/bajas',
      incidencias: '/incidencias',
      incidencia: '/incidencias',
    },
  };
  const sufijo = porEntidad[panel.value]?.[n.entidad];
  return sufijo ? base + sufijo : null;
}

async function abrir(n) {
  if (!n.leida) {
    try {
      await api.marcarLeida(n.idNotificacion);
      n.leida = true;
      store.actualizarConteo();
    } catch (e) {
      error(e);
    }
  }
  const ruta = destino(n);
  if (ruta) router.push(ruta);
}

async function marcarTodas() {
  try {
    await api.marcarTodas();
    lista.value.forEach((n) => (n.leida = true));
    store.actualizarConteo();
  } catch (e) {
    error(e);
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Notificaciones" descripcion="Avisos del sistema sobre tus trámites y prácticas.">
    <SelectButton v-model="filtro" :options="['Todas', 'Sin leer']" :allow-empty="false" @change="cargar" />
    <Button label="Marcar todas como leídas" icon="pi pi-check" outlined @click="marcarTodas" />
  </Encabezado>

  <div class="tarjeta !p-0 divide-y divide-slate-100">
    <div v-if="cargando" class="p-6 text-slate-500">Cargando…</div>
    <Vacio v-else-if="!lista.length" icono="pi pi-bell-slash" titulo="No tienes notificaciones" />
    <button
      v-for="n in lista"
      v-else
      :key="n.idNotificacion"
      type="button"
      class="w-full text-left px-5 py-4 flex gap-3 hover:bg-slate-50"
      :class="{ 'bg-blue-50/60': !n.leida }"
      @click="abrir(n)"
    >
      <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="n.leida ? 'bg-transparent' : 'bg-blue-600'" />
      <span class="flex-1 min-w-0">
        <span class="block font-medium text-slate-800">{{ n.titulo }}</span>
        <span v-if="n.mensaje" class="block text-sm text-slate-600">{{ n.mensaje }}</span>
        <span class="block mt-1 text-xs text-slate-400">{{ fechaHora(n.creadaEn) }}</span>
      </span>
    </button>
  </div>
</template>
