<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Vacio from './Vacio.vue';
import * as api from '../services/practicas';
import { useAviso } from '../composables/useAviso';
import { fecha, hoyISO } from '../utils/formato';

// SIGEA-32: bitácora diaria. El alumno registra; ofertador y admins solo consultan.
const props = defineProps({
  practica: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  tareas: { type: Array, default: () => [] },
});
const emit = defineEmits(['cambio']);
const { exito, error, confirmar } = useAviso();

const registros = ref([]);
const cargando = ref(true);
const guardando = ref(false);
const form = reactive({ fecha: new Date(), horas: 8, descripcion: '', idTarea: null });

const minFecha = computed(() => {
  const [a, m, d] = props.practica.fechaInicio.split('-').map(Number);
  return new Date(a, m - 1, d);
});
const tareasAbiertas = computed(() => props.tareas.filter((t) => t.estado !== 'COMPLETADA'));
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function cargar() {
  try {
    registros.value = (await api.bitacora(props.practica.idPractica)).registros;
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function guardar() {
  if (form.descripcion.trim().length < 10) return error('Describe lo que hiciste (mínimo 10 caracteres).');
  if (!form.horas || form.horas <= 0) return error('Indica las horas trabajadas.');
  guardando.value = true;
  try {
    await api.registrarBitacora(props.practica.idPractica, {
      fecha: aISO(form.fecha),
      horas: form.horas,
      descripcion: form.descripcion.trim(),
      idTarea: form.idTarea,
    });
    exito('Registro guardado.');
    Object.assign(form, { descripcion: '', idTarea: null });
    await cargar();
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    guardando.value = false;
  }
}

async function eliminar(r) {
  if (!(await confirmar({ mensaje: '¿Eliminar este registro de bitácora?', aceptar: 'Eliminar', peligro: true }))) return;
  try {
    await api.eliminarRegistro(r.idRegistro);
    await cargar();
    emit('cambio');
  } catch (e) {
    error(e);
  }
}

const capturadoHoy = (r) => new Date(r.creadoEn).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) === hoyISO();

onMounted(cargar);
</script>

<template>
  <div>
    <form v-if="editable" class="mb-6 rounded-lg border border-slate-200 p-4 grid gap-4 md:grid-cols-4" @submit.prevent="guardar">
      <label class="campo">
        Fecha
        <DatePicker v-model="form.fecha" :max-date="new Date()" :min-date="minFecha" date-format="dd/mm/yy" show-icon />
      </label>
      <label class="campo">
        Horas
        <InputNumber v-model="form.horas" :min="0.25" :max="24" :step="0.5" :min-fraction-digits="0" :max-fraction-digits="2" show-buttons />
      </label>
      <label class="campo md:col-span-2">
        Tarea relacionada <span class="font-normal text-slate-400">(opcional)</span>
        <Select v-model="form.idTarea" :options="tareasAbiertas" option-label="titulo" option-value="idTarea" placeholder="Ninguna" show-clear />
      </label>
      <label class="campo md:col-span-4">
        ¿Qué hiciste?
        <Textarea v-model="form.descripcion" rows="3" auto-resize placeholder="Actividades realizadas, aprendizajes, pendientes…" />
      </label>
      <div class="md:col-span-4 flex justify-end">
        <Button type="submit" label="Registrar" icon="pi pi-plus" :loading="guardando" />
      </div>
    </form>

    <div v-if="cargando" class="text-slate-500">Cargando…</div>
    <Vacio v-else-if="!registros.length" icono="pi pi-book" titulo="Sin registros de bitácora" />
    <ol v-else class="relative border-l border-slate-200 ml-2">
      <li v-for="r in registros" :key="r.idRegistro" class="mb-5 ml-5">
        <span class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-[#0b3a63]" />
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <strong>{{ fecha(r.fecha) }}</strong>
          <span class="text-slate-500">· {{ r.horas }} h</span>
          <span v-if="r.tarea" class="text-xs rounded bg-slate-100 px-2 py-0.5">{{ r.tarea }}</span>
          <Button
            v-if="editable && capturadoHoy(r)"
            v-tooltip.top="'Eliminar (solo el mismo día)'"
            icon="pi pi-trash"
            text
            rounded
            size="small"
            severity="danger"
            @click="eliminar(r)"
          />
        </div>
        <p class="text-sm text-slate-700 whitespace-pre-line">{{ r.descripcion }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
</style>
