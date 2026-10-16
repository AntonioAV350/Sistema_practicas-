<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/incidencias';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';
import { fecha, nombreCompleto } from '../../utils/formato';

// Bandeja de incidencias del Administrador Académico
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { exito, error } = useAviso();
const base = `/${route.path.split('/')[1]}`;
const lista = ref([]);
const cargando = ref(true);
const estado = ref('ABIERTA');
const dialogo = ref({ visible: false, incidencia: null, resolucion: '', guardando: false });

async function cargar() {
  cargando.value = true;
  try {
    lista.value = await api.listar({ estado: estado.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function resolver() {
  const d = dialogo.value;
  if (d.resolucion.trim().length < 5) return error('Describe cómo se resolvió.');
  d.guardando = true;
  try {
    await api.resolver(d.incidencia.idIncidencia, d.resolucion.trim());
    exito('Incidencia resuelta. Se avisó al ofertador.');
    d.visible = false;
    cargar();
  } catch (e) {
    error(e);
  } finally {
    d.guardando = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Incidencias" descripcion="Reportes de los ofertadores sobre sus practicantes." />
  <div class="tarjeta">
    <SelectButton
      v-model="estado"
      class="mb-4"
      :options="[
        { label: 'Abiertas', value: 'ABIERTA' },
        { label: 'Resueltas', value: 'RESUELTA' },
        { label: 'Todas', value: null },
      ]"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      @change="cargar"
    />
    <DataTable :value="lista" :loading="cargando" data-key="idIncidencia" paginator :rows="15" size="small" striped-rows>
      <template #empty>No hay incidencias con ese filtro.</template>
      <Column header="Alumno">
        <template #body="{ data }">
          <RouterLink :to="`${base}/practicas/${data.idPractica}`" class="font-medium text-[#0b3a63] hover:underline">
            {{ nombreCompleto(data) }}
          </RouterLink>
          <div class="text-xs text-slate-500">{{ data.matricula }} · {{ data.empresa }}</div>
        </template>
      </Column>
      <Column header="Incidencia">
        <template #body="{ data }">
          <div class="font-medium">{{ data.categoria }} <span class="text-xs text-slate-500">· {{ fecha(data.fechaHecho) }}</span></div>
          <div class="text-sm text-slate-600 line-clamp-2">{{ data.descripcion }}</div>
          <div v-if="data.resolucion" class="text-xs text-emerald-700 mt-1">Resolución: {{ data.resolucion }}</div>
        </template>
      </Column>
      <Column header="Reportó">
        <template #body="{ data }">{{ data.reportadaPorNombre }} {{ data.reportadaPorApellido }}</template>
      </Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
      <Column header="" class="text-right">
        <template #body="{ data }">
          <Button
            v-if="data.estado === 'ABIERTA' && auth.tieneSubrol('ADMIN_ACADEMICO')"
            label="Resolver"
            size="small"
            @click="dialogo = { visible: true, incidencia: data, resolucion: '', guardando: false }"
          />
        </template>
      </Column>
    </DataTable>
  </div>

  <Dialog v-model:visible="dialogo.visible" modal header="Resolver incidencia" class="w-full max-w-lg">
    <p v-if="dialogo.incidencia" class="text-sm text-slate-600 mb-3 whitespace-pre-line">{{ dialogo.incidencia.descripcion }}</p>
    <label class="flex flex-col gap-1.5 text-sm font-medium">
      ¿Cómo se resolvió?
      <Textarea v-model="dialogo.resolucion" rows="4" auto-resize />
    </label>
    <div class="mt-5 flex justify-end gap-2">
      <Button label="Cancelar" severity="secondary" outlined @click="dialogo.visible = false" />
      <Button label="Marcar resuelta" icon="pi pi-check" :loading="dialogo.guardando" @click="resolver" />
    </div>
  </Dialog>
</template>
