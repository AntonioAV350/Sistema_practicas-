<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import SelectButton from 'primevue/selectbutton';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/practicas';
import { useAviso } from '../../composables/useAviso';
import { fecha, nombreCompleto } from '../../utils/formato';

// Alumnos que hacen prácticas con el ofertador
const router = useRouter();
const { error } = useAviso();
const practicas = ref([]);
const cargando = ref(true);
const estado = ref(null);

async function cargar() {
  cargando.value = true;
  try {
    practicas.value = await api.deOfertador({ estado: estado.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Mis practicantes" descripcion="Asigna tareas, revisa su bitácora y genera su carta de aceptación." />
  <div class="tarjeta">
    <SelectButton
      v-model="estado"
      class="mb-4"
      :options="[
        { label: 'Todos', value: null },
        { label: 'Activos', value: 'ACTIVA' },
        { label: 'En cierre', value: 'EN_REVISION_CIERRE' },
        { label: 'Cerrados', value: 'CERRADA' },
        { label: 'Baja', value: 'BAJA' },
      ]"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      @change="cargar"
    />
    <DataTable
      :value="practicas"
      :loading="cargando"
      data-key="idPractica"
      size="small"
      striped-rows
      row-hover
      class="cursor-pointer"
      @row-click="({ data }) => router.push(`/ofertador/practicantes/${data.idPractica}`)"
    >
      <template #empty>Aún no tienes practicantes.</template>
      <Column header="Alumno">
        <template #body="{ data }">
          <div class="font-medium">{{ nombreCompleto(data) }}</div>
          <div class="text-xs text-slate-500">{{ data.matricula }} · {{ data.nombreCarrera }}</div>
        </template>
      </Column>
      <Column field="titulo" header="Vacante" />
      <Column header="Inicio"><template #body="{ data }">{{ fecha(data.fechaInicio) }}</template></Column>
      <Column header="Horas">
        <template #body="{ data }">{{ data.horasAcumuladas }}{{ data.horasRequeridas ? ` / ${data.horasRequeridas}` : '' }}</template>
      </Column>
      <Column header="Bitácora">
        <template #body="{ data }">
          <span :class="{ 'text-red-600 font-semibold': data.estado === 'ACTIVA' && data.diasSinRegistro >= 3 }">
            {{ data.ultimaFechaBitacora ? fecha(data.ultimaFechaBitacora) : 'Sin registros' }}
          </span>
        </template>
      </Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
    </DataTable>
  </div>
</template>
