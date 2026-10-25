<script setup>
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Encabezado from '../../components/Encabezado.vue';
import Vacio from '../../components/Vacio.vue';
import PracticaSeguimiento from '../../components/PracticaSeguimiento.vue';
import * as api from '../../services/practicas';
import { useAviso } from '../../composables/useAviso';
import { fecha, estado as etiqueta } from '../../utils/formato';

// La práctica del alumno (la viva primero; las anteriores quedan como historial)
const { error } = useAviso();
const practicas = ref([]);
const idSeleccionada = ref(null);
const cargando = ref(true);

const actual = computed(() => practicas.value.find((p) => p.idPractica === idSeleccionada.value));
const opciones = computed(() =>
  practicas.value.map((p) => ({ label: `${p.titulo} · ${etiqueta(p.estado)} (${fecha(p.fechaInicio)})`, value: p.idPractica })),
);

async function cargar() {
  try {
    practicas.value = await api.mias();
    if (!practicas.value.some((p) => p.idPractica === idSeleccionada.value)) {
      idSeleccionada.value = practicas.value[0]?.idPractica ?? null;
    }
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Mi práctica" descripcion="Registra tu bitácora diaria y entrega las tareas que te asigne tu supervisor.">
    <Select v-if="practicas.length > 1" v-model="idSeleccionada" :options="opciones" option-label="label" option-value="value" />
  </Encabezado>

  <div v-if="cargando" class="text-slate-500">Cargando…</div>
  <div v-else-if="!actual" class="tarjeta">
    <Vacio icono="pi pi-book" titulo="Aún no tienes una práctica confirmada" texto="Postúlate a una vacante y confirma cuando te acepten.">
      <Button label="Ver vacantes" icon="pi pi-briefcase" @click="$router.push('/alumno/vacantes')" />
    </Vacio>
  </div>
  <PracticaSeguimiento v-else :key="actual.idPractica" :practica="actual" rol="ALUMNO" @recargar="cargar" />
</template>
