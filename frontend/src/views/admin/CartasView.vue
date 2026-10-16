<script setup>
import { onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/cartas';
import { useAviso } from '../../composables/useAviso';
import { fechaHora, nombreCompleto } from '../../utils/formato';

// Bandeja del Administrador Documental: revisar escaneos de cartas de presentación
const { exito, error } = useAviso();
const cartas = ref([]);
const cargando = ref(false);
const estado = ref('ESCANEO_SUBIDO');
const q = ref('');
const revision = ref({ visible: false, carta: null, comentarios: '', guardando: false });

const FILTROS = [
  { label: 'Por revisar', value: 'ESCANEO_SUBIDO' },
  { label: 'Aprobadas', value: 'APROBADA' },
  { label: 'Rechazadas', value: 'RECHAZADA' },
  { label: 'Generadas', value: 'GENERADA' },
  { label: 'Todas', value: null },
];

async function cargar() {
  cargando.value = true;
  try {
    cartas.value = await api.listar({ estado: estado.value || undefined, q: q.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

function abrirRevision(carta) {
  revision.value = { visible: true, carta, comentarios: '', guardando: false };
}

async function decidir(decision) {
  const r = revision.value;
  if (decision === 'RECHAZADA' && !r.comentarios.trim()) return error('Escribe el motivo del rechazo.');
  r.guardando = true;
  try {
    await api.revisar(r.carta.idCarta, decision, r.comentarios.trim() || null);
    exito(decision === 'APROBADA' ? 'Carta aprobada. Se notificó al alumno.' : 'Carta rechazada. Se notificó al alumno.');
    r.visible = false;
    cargar();
  } catch (e) {
    error(e);
  } finally {
    r.guardando = false;
  }
}

const ver = (fn) => fn().catch(error);

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Cartas de presentación" descripcion="Revisa que el escaneo tenga sello y firma y que los datos coincidan." />

  <div class="tarjeta">
    <div class="mb-4 flex flex-wrap gap-3 items-center">
      <SelectButton v-model="estado" :options="FILTROS" option-label="label" option-value="value" :allow-empty="false" @change="cargar" />
      <span class="relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText v-model="q" placeholder="Nombre o matrícula" class="pl-9" @keyup.enter="cargar" />
      </span>
    </div>

    <DataTable :value="cartas" :loading="cargando" data-key="idCarta" paginator :rows="15" size="small" striped-rows>
      <template #empty>No hay cartas en esta bandeja.</template>
      <Column field="folio" header="Folio" />
      <Column header="Alumno">
        <template #body="{ data }">
          <div class="font-medium">{{ nombreCompleto(data) }}</div>
          <div class="text-xs text-slate-500">{{ data.matricula }} · {{ data.nombreCarrera }}</div>
        </template>
      </Column>
      <Column header="Escaneo subido">
        <template #body="{ data }">{{ fechaHora(data.escaneoSubidoEn) }}</template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }"><EstadoTag :estado="data.estado" /></template>
      </Column>
      <Column header="" class="text-right whitespace-nowrap">
        <template #body="{ data }">
          <Button v-tooltip.top="'Ver PDF generado'" icon="pi pi-file-pdf" text rounded @click="ver(() => api.verPdf(data.idCarta))" />
          <Button
            v-if="data.tieneEscaneo"
            v-tooltip.top="'Ver escaneo'"
            icon="pi pi-eye"
            text
            rounded
            @click="ver(() => api.verEscaneo(data.idCarta))"
          />
          <Button v-if="data.estado === 'ESCANEO_SUBIDO'" label="Revisar" size="small" @click="abrirRevision(data)" />
        </template>
      </Column>
    </DataTable>
  </div>

  <Dialog v-model:visible="revision.visible" modal header="Revisar carta" class="w-full max-w-lg">
    <template v-if="revision.carta">
      <p class="text-sm">
        <strong>{{ nombreCompleto(revision.carta) }}</strong> · {{ revision.carta.matricula }}<br />
        <span class="text-slate-500">{{ revision.carta.nombreCarrera }} · Folio {{ revision.carta.folio }}</span>
      </p>
      <div class="my-4 flex gap-2">
        <Button label="Ver escaneo" icon="pi pi-eye" outlined size="small" @click="ver(() => api.verEscaneo(revision.carta.idCarta))" />
        <Button label="Ver PDF original" icon="pi pi-file-pdf" text size="small" @click="ver(() => api.verPdf(revision.carta.idCarta))" />
      </div>
      <label class="flex flex-col gap-1.5 text-sm font-medium">
        Comentarios <span class="font-normal text-slate-500">(obligatorios si la rechazas)</span>
        <Textarea v-model="revision.comentarios" rows="3" auto-resize />
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <Button label="Rechazar" icon="pi pi-times" severity="danger" outlined :loading="revision.guardando" @click="decidir('RECHAZADA')" />
        <Button label="Aprobar" icon="pi pi-check" severity="success" :loading="revision.guardando" @click="decidir('APROBADA')" />
      </div>
    </template>
  </Dialog>
</template>
