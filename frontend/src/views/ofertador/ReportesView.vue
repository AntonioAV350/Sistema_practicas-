<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as incidencias from '../../services/incidencias';
import * as bajas from '../../services/bajas';
import { useAviso } from '../../composables/useAviso';
import { fecha, fechaHora, nombreCompleto } from '../../utils/formato';

// Seguimiento de las incidencias y bajas que registró el ofertador
const router = useRouter();
const { error } = useAviso();
const lista = ref({ incidencias: [], bajas: [] });
const cargando = ref(true);

const irA = ({ data }) => router.push(`/ofertador/practicantes/${data.idPractica}`);

onMounted(async () => {
  try {
    const [i, b] = await Promise.all([incidencias.listar(), bajas.listar()]);
    lista.value = { incidencias: i, bajas: b };
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <Encabezado titulo="Incidencias y bajas" descripcion="Para registrar una nueva, entra al detalle de tu practicante." />
  <Message severity="info" :closable="false" class="mb-5">
    Las incidencias las atiende el Administrador Académico. Las bajas pasan por revisión académica y la decisión final es del Superadministrador.
  </Message>

  <div class="tarjeta mb-6">
    <h3 class="font-semibold mb-3">Incidencias</h3>
    <DataTable :value="lista.incidencias" :loading="cargando" data-key="idIncidencia" size="small" striped-rows row-hover class="cursor-pointer" @row-click="irA">
      <template #empty>No has registrado incidencias.</template>
      <Column header="Alumno"><template #body="{ data }">{{ nombreCompleto(data) }}</template></Column>
      <Column field="categoria" header="Categoría" />
      <Column header="Fecha"><template #body="{ data }">{{ fecha(data.fechaHecho) }}</template></Column>
      <Column header="Resolución"><template #body="{ data }">{{ data.resolucion || '—' }}</template></Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
    </DataTable>
  </div>

  <div class="tarjeta">
    <h3 class="font-semibold mb-3">Solicitudes de baja</h3>
    <DataTable :value="lista.bajas" :loading="cargando" data-key="idSolicitud" size="small" striped-rows row-hover class="cursor-pointer" @row-click="irA">
      <template #empty>No has solicitado bajas.</template>
      <Column header="Alumno"><template #body="{ data }">{{ nombreCompleto(data) }}</template></Column>
      <Column header="Motivo"><template #body="{ data }"><span class="line-clamp-2">{{ data.motivo }}</span></template></Column>
      <Column header="Solicitada"><template #body="{ data }">{{ fechaHora(data.solicitadaEn) }}</template></Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
    </DataTable>
  </div>
</template>
