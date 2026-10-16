<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/alumnos';
import { carreras as cargarCarreras } from '../../services/catalogos';
import { useAviso } from '../../composables/useAviso';
import { nombreCompleto } from '../../utils/formato';

const route = useRoute();
const router = useRouter();
const { error } = useAviso();
const alumnos = ref([]);
const carreras = ref([]);
const cargando = ref(false);
const q = ref('');
const idCarrera = ref(null);
const base = `/${route.path.split('/')[1]}`;

async function cargar() {
  cargando.value = true;
  try {
    alumnos.value = await api.listar({ q: q.value || undefined, idCarrera: idCarrera.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(async () => {
  cargar();
  carreras.value = await cargarCarreras().catch(() => []);
});
</script>

<template>
  <Encabezado titulo="Alumnos" descripcion="Alumnos registrados con el estado de su carta y su práctica." />

  <div class="tarjeta">
    <div class="mb-4 flex flex-wrap gap-3">
      <span class="relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText v-model="q" placeholder="Nombre, matrícula o correo" class="pl-9" @keyup.enter="cargar" />
      </span>
      <Select
        v-model="idCarrera"
        :options="carreras"
        option-label="nombreCarrera"
        option-value="idCarrera"
        placeholder="Todas las carreras"
        show-clear
        @change="cargar"
      />
      <Button icon="pi pi-refresh" text rounded aria-label="Actualizar" @click="cargar" />
    </div>

    <DataTable
      :value="alumnos"
      :loading="cargando"
      data-key="idAlumno"
      paginator
      :rows="15"
      size="small"
      striped-rows
      row-hover
      class="cursor-pointer"
      @row-click="({ data }) => router.push(`${base}/alumnos/${data.idAlumno}`)"
    >
      <template #empty>No hay alumnos con ese filtro.</template>
      <Column field="matricula" header="Matrícula" sortable />
      <Column header="Alumno">
        <template #body="{ data }">
          <div class="font-medium">{{ nombreCompleto(data) }}</div>
          <div class="text-xs text-slate-500">{{ data.email }}</div>
        </template>
      </Column>
      <Column header="Carrera">
        <template #body="{ data }">
          {{ data.nombreCarrera }}
          <span class="text-xs text-slate-500">· {{ data.numeroPeriodo ? `${data.numeroPeriodo}° ` : '' }}{{ data.grupo }}</span>
        </template>
      </Column>
      <Column header="Carta">
        <template #body="{ data }"><EstadoTag :estado="data.estadoCarta" /><span v-if="!data.estadoCarta" class="text-slate-400">Sin carta</span></template>
      </Column>
      <Column header="Práctica">
        <template #body="{ data }"><EstadoTag :estado="data.estadoPractica" /><span v-if="!data.estadoPractica" class="text-slate-400">—</span></template>
      </Column>
    </DataTable>
  </div>
</template>
