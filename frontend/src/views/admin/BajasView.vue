<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/bajas';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';
import { fechaHora, nombreCompleto } from '../../utils/formato';

// Bajas en tres pasos. El Administrador Académico resuelve o escala;
// el Superadministrador aprueba o rechaza las escaladas.
const route = useRoute();
const auth = useAuthStore();
const { exito, error, confirmar } = useAviso();
const base = `/${route.path.split('/')[1]}`;
const esSuper = computed(() => auth.esSuperadmin);

const lista = ref([]);
const cargando = ref(true);
const estado = ref(base === '/superadmin' ? 'ESCALADA' : 'EN_REVISION_ACADEMICA');
const dialogo = ref({ visible: false, tipo: null, baja: null, texto: '', guardando: false });

const FILTROS = [
  { label: 'En revisión académica', value: 'EN_REVISION_ACADEMICA' },
  { label: 'Escaladas', value: 'ESCALADA' },
  { label: 'Aprobadas', value: 'APROBADA' },
  { label: 'Rechazadas', value: 'RECHAZADA' },
  { label: 'Resueltas sin baja', value: 'RESUELTA_SIN_BAJA' },
  { label: 'Todas', value: null },
];

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

function abrir(tipo, baja) {
  dialogo.value = { visible: true, tipo, baja, texto: '', guardando: false };
}

async function enviar(decision) {
  const d = dialogo.value;
  if (d.tipo === 'atender' && !d.texto.trim()) return error('Escribe una nota de lo que se habló con el alumno.');
  if (decision === 'APROBADA') {
    const ok = await confirmar({
      titulo: 'Aprobar baja',
      mensaje: 'La práctica quedará dada de baja de forma definitiva y el alumno podrá postularse a otra vacante.',
      aceptar: 'Aprobar baja',
      peligro: true,
    });
    if (!ok) return;
  }
  d.guardando = true;
  try {
    if (d.tipo === 'atender') await api.atender(d.baja.idSolicitud, decision, d.texto.trim());
    else await api.decidir(d.baja.idSolicitud, decision, d.texto.trim() || null);
    exito('Solicitud actualizada.');
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
  <Encabezado
    :titulo="base === '/superadmin' ? 'Bajas escaladas' : 'Solicitudes de baja'"
    descripcion="Ofertador solicita → Administrador Académico resuelve o escala → Superadministrador decide."
  />
  <div class="tarjeta">
    <SelectButton v-model="estado" class="mb-4" :options="FILTROS" option-label="label" option-value="value" :allow-empty="false" @change="cargar" />
    <DataTable :value="lista" :loading="cargando" data-key="idSolicitud" paginator :rows="15" size="small" striped-rows>
      <template #empty>No hay solicitudes con ese filtro.</template>
      <Column header="Alumno">
        <template #body="{ data }">
          <RouterLink :to="`${base}/practicas/${data.idPractica}`" class="font-medium text-[#0b3a63] hover:underline">
            {{ nombreCompleto(data) }}
          </RouterLink>
          <div class="text-xs text-slate-500">{{ data.matricula }} · {{ data.titulo }} · {{ data.empresa }}</div>
        </template>
      </Column>
      <Column header="Motivo">
        <template #body="{ data }">
          <div class="text-sm line-clamp-3">{{ data.motivo }}</div>
          <div v-if="data.notaAcademica" class="text-xs text-slate-500 mt-1">Nota académica: {{ data.notaAcademica }}</div>
        </template>
      </Column>
      <Column header="Solicitó">
        <template #body="{ data }">
          {{ data.solicitadaPorNombre }} {{ data.solicitadaPorApellido }}
          <div class="text-xs text-slate-500">{{ fechaHora(data.solicitadaEn) }}</div>
        </template>
      </Column>
      <Column header="Estado"><template #body="{ data }"><EstadoTag :estado="data.estado" /></template></Column>
      <Column header="" class="text-right whitespace-nowrap">
        <template #body="{ data }">
          <Button
            v-if="data.estado === 'EN_REVISION_ACADEMICA' && auth.tieneSubrol('ADMIN_ACADEMICO')"
            label="Atender"
            size="small"
            @click="abrir('atender', data)"
          />
          <Button v-if="data.estado === 'ESCALADA' && esSuper" label="Decidir" size="small" severity="danger" @click="abrir('decidir', data)" />
        </template>
      </Column>
    </DataTable>
  </div>

  <Dialog
    v-model:visible="dialogo.visible"
    modal
    :header="dialogo.tipo === 'atender' ? 'Revisión académica' : 'Decisión final'"
    class="w-full max-w-lg"
  >
    <template v-if="dialogo.baja">
      <p class="text-sm"><strong>{{ nombreCompleto(dialogo.baja) }}</strong> · {{ dialogo.baja.titulo }}</p>
      <p class="mt-2 text-sm text-slate-700 whitespace-pre-line">{{ dialogo.baja.motivo }}</p>
      <p v-if="dialogo.baja.incidenciaDescripcion" class="mt-2 text-xs text-slate-500">
        Incidencia relacionada: {{ dialogo.baja.incidenciaDescripcion }}
      </p>
      <p v-if="dialogo.baja.notaAcademica" class="mt-2 text-sm"><strong>Nota académica:</strong> {{ dialogo.baja.notaAcademica }}</p>

      <Message v-if="dialogo.tipo === 'atender'" severity="info" :closable="false" class="my-4">
        Habla con el alumno. Si se resuelve, la práctica continúa; si no, escálala al Superadministrador.
      </Message>
      <label class="mt-4 flex flex-col gap-1.5 text-sm font-medium">
        {{ dialogo.tipo === 'atender' ? 'Nota académica' : 'Comentario (opcional)' }}
        <Textarea v-model="dialogo.texto" rows="3" auto-resize />
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <template v-if="dialogo.tipo === 'atender'">
          <Button label="Resolver sin baja" icon="pi pi-check" severity="success" outlined :loading="dialogo.guardando" @click="enviar('RESUELTA_SIN_BAJA')" />
          <Button label="Escalar" icon="pi pi-arrow-up" severity="warn" :loading="dialogo.guardando" @click="enviar('ESCALADA')" />
        </template>
        <template v-else>
          <Button label="Rechazar baja" icon="pi pi-times" severity="secondary" outlined :loading="dialogo.guardando" @click="enviar('RECHAZADA')" />
          <Button label="Aprobar baja" icon="pi pi-check" severity="danger" :loading="dialogo.guardando" @click="enviar('APROBADA')" />
        </template>
      </div>
    </template>
  </Dialog>
</template>
