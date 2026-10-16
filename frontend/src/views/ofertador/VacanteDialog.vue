<script setup>
import { computed, reactive, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import * as api from '../../services/vacantes';
import { useAviso } from '../../composables/useAviso';
import { estado as etiqueta } from '../../utils/formato';

// Alta / edición de una vacante (SIGEA-29)
const visible = defineModel('visible', { type: Boolean, default: false });
const props = defineProps({
  vacante: { type: Object, default: null },
  tipos: { type: Array, default: () => [] },
});
const emit = defineEmits(['guardada']);
const { exito, error } = useAviso();
const guardando = ref(false);
const errores = reactive({});
const form = reactive({});

const MODALIDADES = ['PRESENCIAL', 'REMOTO', 'MIXTO'].map((m) => ({ label: etiqueta(m), value: m }));
const manana = computed(() => new Date(Date.now() + 86_400_000));
const ocupados = computed(() => (props.vacante ? props.vacante.cupoTotal - props.vacante.cupoDisponible : 0));

watch(visible, (v) => {
  if (!v) return;
  const x = props.vacante ?? {};
  for (const k of Object.keys(errores)) delete errores[k];
  Object.assign(form, {
    titulo: x.titulo ?? '',
    descripcion: x.descripcion ?? '',
    requisitos: x.requisitos ?? '',
    idTipoPractica: x.idTipoPractica ?? props.tipos[0]?.idTipoPractica ?? null,
    modalidadTrabajo: x.modalidadTrabajo ?? 'PRESENCIAL',
    cupoTotal: x.cupoTotal ?? 1,
    cierraEn: x.cierraEn ? new Date(x.cierraEn) : null,
  });
});

function validar() {
  for (const k of Object.keys(errores)) delete errores[k];
  if (form.titulo.trim().length < 3) errores.titulo = 'Escribe un título';
  if (form.descripcion.trim().length < 10) errores.descripcion = 'Describe la vacante (mínimo 10 caracteres)';
  if (!form.idTipoPractica) errores.idTipoPractica = 'Elige el tipo';
  if (!form.cupoTotal || form.cupoTotal < Math.max(1, ocupados.value)) {
    errores.cupoTotal = `El cupo mínimo es ${Math.max(1, ocupados.value)}`;
  }
  return !Object.keys(errores).length;
}

async function guardar() {
  if (!validar()) return;
  guardando.value = true;
  const datos = { ...form, cierraEn: form.cierraEn ? form.cierraEn.toISOString() : null };
  try {
    if (props.vacante) await api.actualizar(props.vacante.idVacante, datos);
    else await api.crear(datos);
    exito(props.vacante ? 'Vacante actualizada.' : 'Vacante publicada.');
    visible.value = false;
    emit('guardada');
  } catch (e) {
    error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="vacante ? 'Editar vacante' : 'Publicar vacante'" class="w-full max-w-2xl">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <label class="campo sm:col-span-2">
        Título del puesto
        <InputText v-model="form.titulo" :invalid="!!errores.titulo" />
        <small v-if="errores.titulo">{{ errores.titulo }}</small>
      </label>
      <label class="campo sm:col-span-2">
        Descripción de las actividades
        <Textarea v-model="form.descripcion" rows="4" auto-resize :invalid="!!errores.descripcion" />
        <small v-if="errores.descripcion">{{ errores.descripcion }}</small>
      </label>
      <label class="campo sm:col-span-2">
        Requisitos <span class="font-normal text-slate-400">(opcional)</span>
        <Textarea v-model="form.requisitos" rows="2" auto-resize />
      </label>
      <label class="campo">
        Tipo de práctica
        <Select
          v-model="form.idTipoPractica"
          :options="tipos"
          :option-label="(t) => t.nombre + (t.horasRequeridas ? ` (${t.horasRequeridas} h)` : '')"
          option-value="idTipoPractica"
          :invalid="!!errores.idTipoPractica"
        />
      </label>
      <label class="campo">
        Modalidad
        <Select v-model="form.modalidadTrabajo" :options="MODALIDADES" option-label="label" option-value="value" />
      </label>
      <label class="campo">
        Cupo (alumnos)
        <InputNumber v-model="form.cupoTotal" :min="1" :max="100" show-buttons :invalid="!!errores.cupoTotal" />
        <small v-if="errores.cupoTotal">{{ errores.cupoTotal }}</small>
      </label>
      <label class="campo">
        Cierra el <span class="font-normal text-slate-400">(opcional)</span>
        <DatePicker v-model="form.cierraEn" :min-date="manana" date-format="dd/mm/yy" show-icon show-clear />
      </label>
      <div class="sm:col-span-2 flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined @click="visible = false" />
        <Button type="submit" :label="vacante ? 'Guardar' : 'Publicar'" icon="pi pi-check" :loading="guardando" />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
.campo small {
  @apply font-normal text-red-600;
}
</style>
