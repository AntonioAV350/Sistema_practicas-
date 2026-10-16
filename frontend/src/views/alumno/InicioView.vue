<script setup>
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import EstadoTag from '../../components/EstadoTag.vue';
import * as cartas from '../../services/cartas';
import * as vacantes from '../../services/vacantes';
import * as practicas from '../../services/practicas';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';
import { fecha, tiempoRestante } from '../../utils/formato';

// Tablero del alumno: en qué paso del proceso va y qué tiene pendiente
const auth = useAuthStore();
const { error } = useAviso();
const carta = ref(null);
const postulaciones = ref([]);
const practica = ref(null);
const cargando = ref(true);

const pendientes = computed(() =>
  postulaciones.value.filter((p) => p.estadoAceptacion === 'PENDIENTE' && new Date(p.expiraEn) > Date.now()),
);
const enEspera = computed(() => postulaciones.value.filter((p) => p.estado === 'POSTULADA').length);
const viva = computed(() => practica.value && ['ACTIVA', 'EN_REVISION_CIERRE'].includes(practica.value.estado));

// Paso actual del proceso para guiar al alumno
const siguiente = computed(() => {
  if (viva.value) return { texto: 'Registra tu bitácora de hoy', to: '/alumno/practica', icono: 'pi pi-book' };
  if (pendientes.value.length) return { texto: 'Confirma tu aceptación antes de que expire', to: '/alumno/postulaciones', icono: 'pi pi-clock' };
  if (!carta.value || carta.value.estado === 'RECHAZADA') return { texto: 'Genera tu carta de presentación', to: '/alumno/carta', icono: 'pi pi-file' };
  if (carta.value.estado === 'GENERADA') return { texto: 'Sube el escaneo firmado de tu carta', to: '/alumno/carta', icono: 'pi pi-upload' };
  if (carta.value.estado === 'ESCANEO_SUBIDO') return { texto: 'Tu carta está en revisión; mientras, revisa las vacantes', to: '/alumno/vacantes', icono: 'pi pi-briefcase' };
  return { texto: 'Postúlate a las vacantes que te interesen', to: '/alumno/vacantes', icono: 'pi pi-briefcase' };
});

const porcentaje = computed(() => {
  const p = practica.value;
  return p?.horasRequeridas ? Math.min(100, Math.round((p.horasAcumuladas / p.horasRequeridas) * 100)) : null;
});

onMounted(async () => {
  try {
    const [c, p, pr] = await Promise.all([cartas.misCartas(), vacantes.misPostulaciones(), practicas.mias()]);
    carta.value = c[0] ?? null;
    postulaciones.value = p;
    practica.value = pr[0] ?? null;
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <section class="tarjeta !bg-[#0b3a63] !border-[#0b3a63] text-white">
      <h2 class="text-2xl font-semibold">Hola, {{ auth.usuario?.nombre }}</h2>
      <p class="mt-1 text-blue-100">Este es el estado de tu proceso de prácticas profesionales.</p>
      <RouterLink
        v-if="!cargando"
        :to="siguiente.to"
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
      >
        <i :class="siguiente.icono" /> {{ siguiente.texto }} <i class="pi pi-arrow-right text-xs" />
      </RouterLink>
    </section>

    <div v-if="!cargando" class="grid gap-6 lg:grid-cols-3">
      <section class="tarjeta">
        <h3 class="font-semibold mb-2">Carta de presentación</h3>
        <EstadoTag v-if="carta" :estado="carta.estado" />
        <p v-else class="text-sm text-slate-500">Aún no la generas.</p>
        <p v-if="carta?.estado === 'RECHAZADA'" class="mt-2 text-sm text-red-600">{{ carta.comentarios }}</p>
        <Button label="Ir a mi carta" text size="small" class="mt-2 !px-0" @click="$router.push('/alumno/carta')" />
      </section>

      <section class="tarjeta">
        <h3 class="font-semibold mb-2">Postulaciones</h3>
        <p class="text-sm">
          <strong>{{ enEspera }}</strong> en espera de respuesta ·
          <strong :class="{ 'text-amber-600': pendientes.length }">{{ pendientes.length }}</strong> por confirmar
        </p>
        <p v-for="p in pendientes" :key="p.idAceptacion" class="mt-2 text-sm text-amber-700">
          <i class="pi pi-clock" /> {{ p.titulo }}: quedan {{ tiempoRestante(p.expiraEn) }}
        </p>
        <Button label="Ver postulaciones" text size="small" class="mt-2 !px-0" @click="$router.push('/alumno/postulaciones')" />
      </section>

      <section class="tarjeta">
        <h3 class="font-semibold mb-2">Mi práctica</h3>
        <template v-if="practica">
          <p class="text-sm font-medium">{{ practica.titulo }}</p>
          <p class="text-xs text-slate-500 mb-2">{{ practica.empresa }} · desde {{ fecha(practica.fechaInicio) }}</p>
          <EstadoTag :estado="practica.estado" />
          <template v-if="porcentaje !== null">
            <div class="mt-3 text-xs text-slate-600">{{ practica.horasAcumuladas }} de {{ practica.horasRequeridas }} h</div>
            <ProgressBar :value="porcentaje" class="!h-2 mt-1" />
          </template>
          <p v-if="practica.estado === 'ACTIVA' && practica.diasSinRegistro >= 1" class="mt-2 text-sm text-amber-700">
            {{ practica.diasSinRegistro }} día(s) sin registrar bitácora
          </p>
        </template>
        <p v-else class="text-sm text-slate-500">Todavía no tienes práctica confirmada.</p>
      </section>
    </div>
  </div>
</template>
