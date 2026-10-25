<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/vacantes';
import { useAviso } from '../../composables/useAviso';
import { fecha } from '../../utils/formato';

// Consulta de todas las vacantes del sistema (solo lectura)
const route = useRoute();
const router = useRouter();
const { error } = useAviso();
const vacantes = ref([]);
const cargando = ref(false);
const estado = ref('ABIERTA');
const q = ref('');
const base = `/${route.path.split('/')[1]}`;

async function cargar() {
  cargando.value = true;
  try {
    vacantes.value = await api.todas({ estado: estado.value || undefined, q: q.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Vacantes" descripcion="Todas las vacantes publicadas por los ofertadores." />
  <div class="tarjeta">
    <div class="mb-4 flex flex-wrap gap-3">
      <SelectButton
        v-model="estado"
        :options="[
          { label: 'Abiertas', value: 'ABIERTA' },
          { label: 'Cerradas', value: 'CERRADA' },
          { label: 'Canceladas', value: 'CANCELADA' },
          { label: 'Todas', value: null },
        ]"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        @change="cargar"
      />
      <InputText v-model="q" placeholder="Título o empresa" @keyup.enter="cargar" />
    </div>
    <DataTable
      :value="vacantes"
      :loading="cargando"
      data-key="idVacante"
      paginator
      :rows="15"
      size="small"
      striped-rows
      row-hover
      class="cursor-pointer"
      @row-click="({ data }) => router.push(`${base}/vacantes/${data.idVacante}`)"
    >
      <template #empty>No hay vacantes con ese filtro.</template>
      <Column header="Vacante">
        <template #body="{ data }">
          <div class="font-medium">{{ data.titulo }}</div>
          <div class="text-xs text-slate-500">{{ data.empresa }} · {{ data.ofertadorNombre }} {{ data.ofertadorApellido }}</div>
        </template>
      </Column>
      <Column field="tipoPractica" header="Tipo" />
      <Column header="Cupo"><template #body="{ data }">{{ data.cupoDisponible }} / {{ data.cupoTotal }}</template></Column>
      <Column field="postulacionesTotal" header="Postulaciones" />
      <Column field="practicantes" header="Practicantes" />
      <Column header="Publicada"><template #body="{ data }">{{ fecha(data.publicadaEn) }}</template></Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
    </DataTable>
  </div>
</template>
