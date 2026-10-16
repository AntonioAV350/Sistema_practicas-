<script setup>
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Indicador from '../../components/Indicador.vue';
import { get } from '../../services/http';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';

// Tablero del ofertador: lo que necesita su atención
const auth = useAuthStore();
const { error } = useAviso();
const r = ref(null);

onMounted(async () => {
  try {
    r.value = await get('/ofertadores/resumen');
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <div class="space-y-6">
    <section class="tarjeta flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold">Hola, {{ auth.usuario?.nombre }}</h2>
        <p class="text-slate-500">Resumen de tus vacantes y practicantes.</p>
      </div>
      <Button label="Publicar vacante" icon="pi pi-plus" @click="$router.push('/ofertador/vacantes')" />
    </section>

    <div v-if="r" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Indicador :valor="r.postulacionesNuevas" etiqueta="Postulaciones por revisar" icono="pi pi-inbox" to="/ofertador/vacantes" alerta />
      <Indicador :valor="r.tareasPorRevisar" etiqueta="Tareas entregadas por revisar" icono="pi pi-list-check" to="/ofertador/practicantes" alerta />
      <Indicador :valor="r.practicantesSinBitacora" etiqueta="Practicantes con 3+ días sin bitácora" icono="pi pi-exclamation-triangle" to="/ofertador/practicantes" alerta />
      <Indicador :valor="r.vacantesAbiertas" etiqueta="Vacantes abiertas" icono="pi pi-briefcase" to="/ofertador/vacantes" />
      <Indicador :valor="r.aceptacionesPendientes" etiqueta="Aceptaciones esperando al alumno" icono="pi pi-clock" to="/ofertador/vacantes" />
      <Indicador :valor="r.practicantesActivos" etiqueta="Practicantes activos" icono="pi pi-users" to="/ofertador/practicantes" />
    </div>
  </div>
</template>
