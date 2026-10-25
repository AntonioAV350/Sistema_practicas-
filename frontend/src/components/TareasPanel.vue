<script setup>
import { reactive, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import EstadoTag from './EstadoTag.vue';
import Vacio from './Vacio.vue';
import SelectorArchivo from './SelectorArchivo.vue';
import * as api from '../services/practicas';
import { useAviso } from '../composables/useAviso';
import { fecha, fechaHora, hoyISO } from '../utils/formato';

// Tareas que asigna el ofertador. El alumno entrega evidencia; el ofertador
// la aprueba (COMPLETADA) o la devuelve (PENDIENTE).
const props = defineProps({
  practica: { type: Object, required: true },
  tareas: { type: Array, required: true },
  rol: { type: String, required: true }, // ALUMNO | OFERTADOR | ADMIN
});
const emit = defineEmits(['cambio']);
const { exito, error } = useAviso();

const activa = () => props.practica.estado === 'ACTIVA';
const nueva = reactive({ visible: false, titulo: '', descripcion: '', fechaLimite: null, guardando: false });
const entrega = reactive({ visible: false, tarea: null, archivo: null, guardando: false });
const revision = reactive({ visible: false, tarea: null, comentario: '', guardando: false });

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const vencida = (t) => t.estado === 'PENDIENTE' && t.fechaLimite < hoyISO();

async function crear() {
  if (nueva.titulo.trim().length < 3 || !nueva.fechaLimite) return error('Escribe el título y la fecha límite.');
  nueva.guardando = true;
  try {
    await api.crearTarea(props.practica.idPractica, {
      titulo: nueva.titulo.trim(),
      descripcion: nueva.descripcion.trim() || null,
      fechaLimite: aISO(nueva.fechaLimite),
    });
    exito('Tarea asignada. Se notificó al alumno.');
    Object.assign(nueva, { visible: false, titulo: '', descripcion: '', fechaLimite: null });
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    nueva.guardando = false;
  }
}

async function entregar() {
  if (!entrega.archivo) return;
  entrega.guardando = true;
  try {
    await api.entregarEvidencia(entrega.tarea.idTarea, entrega.archivo);
    exito('Evidencia entregada.');
    Object.assign(entrega, { visible: false, archivo: null });
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    entrega.guardando = false;
  }
}

async function revisar(decision) {
  revision.guardando = true;
  try {
    await api.revisarTarea(revision.tarea.idTarea, decision, revision.comentario.trim() || null);
    exito(decision === 'COMPLETAR' ? 'Tarea completada.' : 'Tarea devuelta al alumno.');
    revision.visible = false;
    emit('cambio');
  } catch (e) {
    error(e);
  } finally {
    revision.guardando = false;
  }
}
</script>

<template>
  <div>
    <div v-if="rol === 'OFERTADOR' && activa()" class="mb-4 flex justify-end">
      <Button label="Asignar tarea" icon="pi pi-plus" @click="nueva.visible = true" />
    </div>

    <Vacio v-if="!tareas.length" icono="pi pi-list-check" titulo="Sin tareas asignadas" />

    <div v-for="t in tareas" :key="t.idTarea" class="rounded-lg border border-slate-200 p-4 mb-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium">{{ t.titulo }}</div>
          <div class="text-xs" :class="vencida(t) ? 'text-red-600 font-semibold' : 'text-slate-500'">
            Fecha límite: {{ fecha(t.fechaLimite) }}{{ vencida(t) ? ' · vencida' : '' }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <EstadoTag :estado="t.estado" />
          <Button
            v-if="rol === 'ALUMNO' && t.estado !== 'COMPLETADA' && activa()"
            :label="t.estado === 'ENTREGADA' ? 'Agregar evidencia' : 'Entregar'"
            icon="pi pi-upload"
            size="small"
            outlined
            @click="Object.assign(entrega, { visible: true, tarea: t, archivo: null })"
          />
          <Button
            v-if="rol === 'OFERTADOR' && t.estado === 'ENTREGADA'"
            label="Revisar"
            size="small"
            @click="Object.assign(revision, { visible: true, tarea: t, comentario: '' })"
          />
        </div>
      </div>
      <p v-if="t.descripcion" class="mt-2 text-sm text-slate-700 whitespace-pre-line">{{ t.descripcion }}</p>
      <div v-if="t.evidencias.length" class="mt-3 flex flex-wrap gap-2">
        <Button
          v-for="ev in t.evidencias"
          :key="ev.idEvidencia"
          v-tooltip.top="`Subida ${fechaHora(ev.subidoEn)}`"
          :label="ev.nombreArchivo"
          icon="pi pi-paperclip"
          size="small"
          text
          @click="api.verEvidencia(ev.idEvidencia).catch(error)"
        />
      </div>
    </div>

    <Dialog v-model:visible="nueva.visible" modal header="Asignar tarea" class="w-full max-w-lg">
      <form class="flex flex-col gap-4" @submit.prevent="crear">
        <label class="campo">Título <InputText v-model="nueva.titulo" /></label>
        <label class="campo">Descripción <Textarea v-model="nueva.descripcion" rows="3" auto-resize /></label>
        <label class="campo">
          Fecha límite
          <DatePicker v-model="nueva.fechaLimite" :min-date="new Date()" date-format="dd/mm/yy" show-icon />
        </label>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="nueva.visible = false" />
          <Button type="submit" label="Asignar" :loading="nueva.guardando" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="entrega.visible" modal :header="`Entregar: ${entrega.tarea?.titulo ?? ''}`" class="w-full max-w-lg">
      <SelectorArchivo v-model="entrega.archivo" :disabled="entrega.guardando" />
      <div class="mt-5 flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined @click="entrega.visible = false" />
        <Button label="Entregar" icon="pi pi-upload" :disabled="!entrega.archivo" :loading="entrega.guardando" @click="entregar" />
      </div>
    </Dialog>

    <Dialog v-model:visible="revision.visible" modal :header="`Revisar: ${revision.tarea?.titulo ?? ''}`" class="w-full max-w-lg">
      <label class="campo">
        Comentario para el alumno <span class="font-normal text-slate-400">(opcional)</span>
        <Textarea v-model="revision.comentario" rows="3" auto-resize />
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <Button label="Devolver" icon="pi pi-undo" severity="warn" outlined :loading="revision.guardando" @click="revisar('DEVOLVER')" />
        <Button label="Marcar completada" icon="pi pi-check" severity="success" :loading="revision.guardando" @click="revisar('COMPLETAR')" />
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
</style>
