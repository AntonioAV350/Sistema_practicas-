<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import VacanteDialog from './VacanteDialog.vue';
import * as api from '../../services/vacantes';
import { tiposPractica as cargarTipos } from '../../services/catalogos';
import { useAviso } from '../../composables/useAviso';
import { fecha } from '../../utils/formato';

// SIGEA-29: el ofertador publica y administra sus vacantes
const router = useRouter();
const { exito, error, confirmar } = useAviso();
const vacantes = ref([]);
const tipos = ref([]);
const cargando = ref(true);
const dialogo = ref({ visible: false, vacante: null });

async function cargar() {
  cargando.value = true;
  try {
    vacantes.value = await api.mias();
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function cambiarEstado(v, estado) {
  const textos = {
    CERRADA: { titulo: 'Cerrar vacante', mensaje: `"${v.titulo}" dejará de recibir postulaciones. Puedes reabrirla después.`, aceptar: 'Cerrar' },
    ABIERTA: { titulo: 'Reabrir vacante', mensaje: `"${v.titulo}" volverá a recibir postulaciones.`, aceptar: 'Reabrir' },
    CANCELADA: {
      titulo: 'Cancelar vacante',
      mensaje: `Se cancelará "${v.titulo}" de forma definitiva y se avisará a los alumnos postulados.`,
      aceptar: 'Cancelar vacante',
      peligro: true,
    },
  }[estado];
  if (!(await confirmar(textos))) return;
  try {
    await api.cambiarEstado(v.idVacante, estado);
    exito('Vacante actualizada.');
    cargar();
  } catch (e) {
    error(e);
  }
}

onMounted(async () => {
  cargar();
  tipos.value = await cargarTipos().catch(() => []);
});
</script>

<template>
  <Encabezado titulo="Mis vacantes" descripcion="Publica vacantes y revisa a los alumnos que se postulan.">
    <Button label="Publicar vacante" icon="pi pi-plus" @click="dialogo = { visible: true, vacante: null }" />
  </Encabezado>

  <div class="tarjeta">
    <DataTable
      :value="vacantes"
      :loading="cargando"
      data-key="idVacante"
      size="small"
      striped-rows
      row-hover
      class="cursor-pointer"
      @row-click="({ data }) => router.push(`/ofertador/vacantes/${data.idVacante}`)"
    >
      <template #empty>Aún no publicas vacantes.</template>
      <Column header="Vacante">
        <template #body="{ data }">
          <div class="font-medium">{{ data.titulo }}</div>
          <div class="text-xs text-slate-500">{{ data.tipoPractica }} · publicada {{ fecha(data.publicadaEn) }}</div>
        </template>
      </Column>
      <Column header="Cupo">
        <template #body="{ data }">{{ data.cupoDisponible }} / {{ data.cupoTotal }} libres</template>
      </Column>
      <Column header="Postulaciones">
        <template #body="{ data }">
          {{ data.postulacionesTotal }}
          <Badge v-if="data.postulacionesNuevas > 0" :value="`${data.postulacionesNuevas} nuevas`" severity="warn" class="ml-1" />
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }"><EstadoTag :estado="data.estado" /></template>
      </Column>
      <Column header="" class="text-right whitespace-nowrap">
        <template #body="{ data }">
          <span @click.stop>
            <Button
              v-if="data.estado !== 'CANCELADA'"
              v-tooltip.top="'Editar'"
              icon="pi pi-pencil"
              text
              rounded
              @click="dialogo = { visible: true, vacante: data }"
            />
            <Button
              v-if="data.estado === 'ABIERTA'"
              v-tooltip.top="'Cerrar'"
              icon="pi pi-lock"
              text
              rounded
              @click="cambiarEstado(data, 'CERRADA')"
            />
            <Button
              v-if="data.estado === 'CERRADA'"
              v-tooltip.top="'Reabrir'"
              icon="pi pi-lock-open"
              text
              rounded
              @click="cambiarEstado(data, 'ABIERTA')"
            />
            <Button
              v-if="data.estado !== 'CANCELADA'"
              v-tooltip.top="'Cancelar'"
              icon="pi pi-times-circle"
              severity="danger"
              text
              rounded
              @click="cambiarEstado(data, 'CANCELADA')"
            />
          </span>
        </template>
      </Column>
    </DataTable>
  </div>

  <VacanteDialog v-model:visible="dialogo.visible" :vacante="dialogo.vacante" :tipos="tipos" @guardada="cargar" />
</template>
