<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Indicador from '../../components/Indicador.vue';
import * as api from '../../services/practicas';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';
import { rol as etiquetaRol } from '../../utils/formato';

// Tablero de administración. Cada subrol ve primero lo que le toca atender.
const route = useRoute();
const auth = useAuthStore();
const { error } = useAviso();
const r = ref(null);
const base = `/${route.path.split('/')[1]}`;
const esSuper = computed(() => auth.esSuperadmin);
const academico = computed(() => auth.tieneSubrol('ADMIN_ACADEMICO'));
const documental = computed(() => auth.tieneSubrol('ADMIN_DOCUMENTAL'));
const titulo = computed(() => {
  const x = auth.usuario?.roles?.[0];
  return x ? etiquetaRol(x.subrol || x.rol) : '';
});

onMounted(async () => {
  try {
    r.value = await api.resumen();
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <div class="space-y-6">
    <section class="tarjeta">
      <h2 class="text-2xl font-semibold">Hola, {{ auth.usuario?.nombre }}</h2>
      <p class="text-slate-500">{{ titulo }} · pendientes del módulo de prácticas.</p>
    </section>

    <template v-if="r">
      <h3 class="font-semibold text-slate-700">Por atender</h3>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Indicador v-if="esSuper" :valor="r.bajasEscaladas" etiqueta="Bajas esperando tu decisión" icono="pi pi-user-minus" :to="`${base}/bajas`" alerta />
        <Indicador v-if="documental" :valor="r.cartasPorRevisar" etiqueta="Cartas por revisar" icono="pi pi-file-check" :to="`${base}/cartas`" alerta />
        <Indicador v-if="academico" :valor="r.cierresPendientes" etiqueta="Cierres por confirmar" icono="pi pi-check-square" :to="`${base}/cierres`" alerta />
        <Indicador v-if="academico" :valor="r.incidenciasAbiertas" etiqueta="Incidencias abiertas" icono="pi pi-exclamation-circle" :to="`${base}/incidencias`" alerta />
        <Indicador v-if="academico" :valor="r.bajasEnRevision" etiqueta="Bajas en revisión académica" icono="pi pi-user-minus" :to="`${base}/bajas`" alerta />
        <Indicador :valor="r.sinBitacora" etiqueta="Alumnos con 3+ días sin bitácora" icono="pi pi-exclamation-triangle" :to="`${base}/practicas`" alerta />
      </div>

      <h3 class="font-semibold text-slate-700">General</h3>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador :valor="r.practicasActivas" etiqueta="Prácticas activas" icono="pi pi-book" :to="`${base}/practicas`" />
        <Indicador :valor="r.practicasCerradas" etiqueta="Prácticas concluidas" icono="pi pi-verified" />
        <Indicador :valor="r.vacantesAbiertas" etiqueta="Vacantes abiertas" icono="pi pi-briefcase" :to="`${base}/vacantes`" />
        <Indicador :valor="r.alumnos" etiqueta="Alumnos registrados" icono="pi pi-users" :to="`${base}/alumnos`" />
      </div>
    </template>
  </div>
</template>
