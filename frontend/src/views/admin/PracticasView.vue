<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/practicas';
import { useAviso } from '../../composables/useAviso';
import { fecha, nombreCompleto } from '../../utils/formato';

// Supervisión de prácticas (avance, días sin bitácora). La misma vista sirve
// para "Cierres": entra con el filtro de EN_REVISION_CIERRE.
const route = useRoute();
const router = useRouter();
const { error } = useAviso();
const base = `/${route.path.split('/')[1]}`;
const soloCierres = !!route.meta.soloCierres;

const practicas = ref([]);
const cargando = ref(true);
const estado = ref(soloCierres ? 'EN_REVISION_CIERRE' : 'ACTIVA');
const q = ref('');
const sinBitacora = ref(false);

async function cargar() {
  cargando.value = true;
  try {
    practicas.value = await api.listar({
      estado: estado.value || undefined,
      q: q.value || undefined,
      sinBitacora: sinBitacora.value ? 3 : undefined,
    });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    :titulo="soloCierres ? 'Cierres por confirmar' : 'Prácticas'"
    :descripcion="soloCierres ? 'Prácticas que pidieron su cierre. El cierre siempre lo confirma un administrador.' : 'Avance de los alumnos en sus prácticas.'"
  />
  <div class="tarjeta">
    <div v-if="!soloCierres" class="mb-4 flex flex-wrap items-center gap-4">
      <SelectButton
        v-model="estado"
        :options="[
          { label: 'Activas', value: 'ACTIVA' },
          { label: 'En cierre', value: 'EN_REVISION_CIERRE' },
          { label: 'Cerradas', value: 'CERRADA' },
          { label: 'Baja', value: 'BAJA' },
          { label: 'Todas', value: null },
        ]"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        @change="cargar"
      />
      <InputText v-model="q" placeholder="Alumno, matrícula, vacante o empresa" class="w-72" @keyup.enter="cargar" />
      <label class="flex items-center gap-2 text-sm">
        <ToggleSwitch v-model="sinBitacora" @change="cargar" /> 3+ días sin bitácora
      </label>
    </div>

    <DataTable
      :value="practicas"
      :loading="cargando"
      data-key="idPractica"
      paginator
      :rows="15"
      size="small"
      striped-rows
      row-hover
      class="cursor-pointer"
      @row-click="({ data }) => router.push(`${base}/practicas/${data.idPractica}`)"
    >
      <template #empty>No hay prácticas con ese filtro.</template>
      <Column header="Alumno">
        <template #body="{ data }">
          <div class="font-medium">{{ nombreCompleto(data) }}</div>
          <div class="text-xs text-slate-500">{{ data.matricula }} · {{ data.nombreCarrera }}</div>
        </template>
      </Column>
      <Column header="Vacante">
        <template #body="{ data }">
          {{ data.titulo }}
          <div class="text-xs text-slate-500">{{ data.empresa }}</div>
        </template>
      </Column>
      <Column header="Horas">
        <template #body="{ data }">{{ data.horasAcumuladas }}{{ data.horasRequeridas ? ` / ${data.horasRequeridas}` : ' (proyecto)' }}</template>
      </Column>
      <Column header="Última bitácora">
        <template #body="{ data }">
          <span :class="{ 'text-red-600 font-semibold': data.estado === 'ACTIVA' && data.diasSinRegistro >= 3 }">
            {{ data.ultimaFechaBitacora ? fecha(data.ultimaFechaBitacora) : 'Sin registros' }}
            <template v-if="data.estado === 'ACTIVA'">({{ data.diasSinRegistro }} d)</template>
          </span>
        </template>
      </Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
    </DataTable>
  </div>
</template>
