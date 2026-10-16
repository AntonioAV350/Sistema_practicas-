<script setup>
import { onMounted, reactive, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import EstadoTag from './EstadoTag.vue';
import Vacio from './Vacio.vue';
import * as incidencias from '../services/incidencias';
import * as bajas from '../services/bajas';
import { categoriasIncidencia } from '../services/catalogos';
import { useAviso } from '../composables/useAviso';
import { fecha, fechaHora } from '../utils/formato';

// Incidencias y solicitudes de baja de una práctica. El ofertador las registra
// desde aquí; administración solo las consulta (las atiende en sus bandejas).
const props = defineProps({
  practica: { type: Object, required: true },
  puedeRegistrar: { type: Boolean, default: false },
});
const emit = defineEmits(['cambio']);
const { exito, error } = useAviso();

const lista = ref({ incidencias: [], bajas: [] });
const categorias = ref([]);
const inc = reactive({ visible: false, idCategoria: null, categoriaLibre: '', descripcion: '', fechaHecho: new Date(), guardando: false });
const baja = reactive({ visible: false, idIncidencia: null, motivo: '', guardando: false });
const enCurso = () => ['ACTIVA', 'EN_REVISION_CIERRE'].includes(props.practica.estado);
const bajaAbierta = () => lista.value.bajas.some((b) => ['EN_REVISION_ACADEMICA', 'ESCALADA'].includes(b.estado));
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function cargar() {
  try {
    const id = props.practica.idPractica;
    const [i, b] = await Promise.all([incidencias.listar({ idPractica: id }), bajas.listar({ idPractica: id })]);
    lista.value = { incidencias: i, bajas: b };
  } catch (e) {
    error(e);
  }
}

async function registrarIncidencia() {
  if (!inc.idCategoria && !inc.categoriaLibre.trim()) return error('Elige una categoría o escribe una.');
  if (inc.descripcion.trim().length < 10) return error('Describe lo que pasó (mínimo 10 caracteres).');
  inc.guardando = true;
  try {
    await incidencias.registrar({
      idPractica: props.practica.idPractica,
      idCategoria: inc.idCategoria,
      categoriaLibre: inc.idCategoria ? null : inc.categoriaLibre.trim(),
      descripcion: inc.descripcion.trim(),
      fechaHecho: aISO(inc.fechaHecho),
    });
    exito('Incidencia registrada. Se avisó al Administrador Académico.');
    Object.assign(inc, { visible: false, idCategoria: null, categoriaLibre: '', descripcion: '' });
    cargar();
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    inc.guardando = false;
  }
}

async function solicitarBaja() {
  if (baja.motivo.trim().length < 10) return error('Explica el motivo (mínimo 10 caracteres).');
  baja.guardando = true;
  try {
    await bajas.solicitar({ idPractica: props.practica.idPractica, idIncidencia: baja.idIncidencia, motivo: baja.motivo.trim() });
    exito('Solicitud de baja enviada a revisión académica.');
    Object.assign(baja, { visible: false, idIncidencia: null, motivo: '' });
    cargar();
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    baja.guardando = false;
  }
}

onMounted(async () => {
  cargar();
  if (props.puedeRegistrar) categorias.value = await categoriasIncidencia().catch(() => []);
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="puedeRegistrar && enCurso()" class="flex flex-wrap justify-end gap-2">
      <Button label="Registrar incidencia" icon="pi pi-exclamation-circle" severity="warn" outlined @click="inc.visible = true" />
      <Button
        v-tooltip.top="bajaAbierta() ? 'Ya hay una solicitud de baja en curso' : ''"
        label="Solicitar baja"
        icon="pi pi-user-minus"
        severity="danger"
        outlined
        :disabled="bajaAbierta()"
        @click="baja.visible = true"
      />
    </div>

    <div>
      <h4 class="font-semibold mb-2">Incidencias</h4>
      <Vacio v-if="!lista.incidencias.length" icono="pi pi-check-circle" titulo="Sin incidencias" />
      <div v-for="i in lista.incidencias" :key="i.idIncidencia" class="rounded-lg border border-slate-200 p-3 mb-2 text-sm">
        <div class="flex justify-between gap-2">
          <span><strong>{{ i.categoria }}</strong> · {{ fecha(i.fechaHecho) }}</span>
          <EstadoTag :estado="i.estado" />
        </div>
        <p class="mt-1 text-slate-700 whitespace-pre-line">{{ i.descripcion }}</p>
        <p v-if="i.resolucion" class="mt-2 rounded bg-emerald-50 p-2 text-emerald-800">
          <strong>Resolución:</strong> {{ i.resolucion }} <span class="text-xs">({{ fechaHora(i.resueltaEn) }})</span>
        </p>
      </div>
    </div>

    <div>
      <h4 class="font-semibold mb-2">Solicitudes de baja</h4>
      <Vacio v-if="!lista.bajas.length" icono="pi pi-check-circle" titulo="Sin solicitudes de baja" />
      <div v-for="b in lista.bajas" :key="b.idSolicitud" class="rounded-lg border border-slate-200 p-3 mb-2 text-sm">
        <div class="flex justify-between gap-2">
          <span>Solicitada {{ fechaHora(b.solicitadaEn) }}</span>
          <EstadoTag :estado="b.estado" />
        </div>
        <p class="mt-1 text-slate-700 whitespace-pre-line">{{ b.motivo }}</p>
        <p v-if="b.notaAcademica" class="mt-1 text-slate-600"><strong>Nota académica:</strong> {{ b.notaAcademica }}</p>
        <p v-if="b.comentarioDecision" class="mt-1 text-slate-600"><strong>Decisión:</strong> {{ b.comentarioDecision }}</p>
      </div>
    </div>

    <Dialog v-model:visible="inc.visible" modal header="Registrar incidencia" class="w-full max-w-lg">
      <div class="flex flex-col gap-4">
        <label class="campo">
          Categoría
          <Select v-model="inc.idCategoria" :options="categorias" option-label="nombre" option-value="idCategoria" placeholder="Otra (escríbela abajo)" show-clear />
        </label>
        <label v-if="!inc.idCategoria" class="campo">Otra categoría <InputText v-model="inc.categoriaLibre" /></label>
        <label class="campo">
          Fecha del hecho
          <DatePicker v-model="inc.fechaHecho" :max-date="new Date()" date-format="dd/mm/yy" show-icon />
        </label>
        <label class="campo">Descripción <Textarea v-model="inc.descripcion" rows="4" auto-resize /></label>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="inc.visible = false" />
          <Button label="Registrar" icon="pi pi-check" :loading="inc.guardando" @click="registrarIncidencia" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="baja.visible" modal header="Solicitar baja del practicante" class="w-full max-w-lg">
      <p class="text-sm text-slate-600 mb-4">
        La solicitud pasa primero al Administrador Académico y, si no se resuelve, al Superadministrador, que decide en definitiva.
      </p>
      <div class="flex flex-col gap-4">
        <label class="campo">
          Incidencia relacionada <span class="font-normal text-slate-400">(opcional)</span>
          <Select
            v-model="baja.idIncidencia"
            :options="lista.incidencias"
            :option-label="(i) => `${i.categoria} · ${fecha(i.fechaHecho)}`"
            option-value="idIncidencia"
            placeholder="Ninguna"
            show-clear
          />
        </label>
        <label class="campo">Motivo <Textarea v-model="baja.motivo" rows="4" auto-resize /></label>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="baja.visible = false" />
          <Button label="Enviar solicitud" icon="pi pi-send" severity="danger" :loading="baja.guardando" @click="solicitarBaja" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
</style>
