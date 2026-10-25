<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import PracticaResumen from './PracticaResumen.vue';
import BitacoraPanel from './BitacoraPanel.vue';
import TareasPanel from './TareasPanel.vue';
import ReportesPractica from './ReportesPractica.vue';
import * as api from '../services/practicas';
import * as cartas from '../services/cartas';
import { useAviso } from '../composables/useAviso';
import { useAuthStore } from '../stores/auth';

// Vista completa de una práctica para cualquiera de los tres roles que la ven:
// resumen, acciones según el rol, bitácora y tareas.
const props = defineProps({
  practica: { type: Object, required: true },
  rol: { type: String, required: true }, // ALUMNO | OFERTADOR | ADMIN
});
const emit = defineEmits(['recargar']);
const auth = useAuthStore();
const { exito, error, confirmar } = useAviso();

const tareas = ref([]);
const pestana = ref('bitacora');
const cierre = ref({ visible: false, observaciones: '', guardando: false });
const trabajando = ref(false);

const p = computed(() => props.practica);
const activa = computed(() => p.value.estado === 'ACTIVA');
const porHoras = computed(() => !!p.value.horasRequeridas);
const horasCompletas = computed(() => porHoras.value && p.value.horasAcumuladas >= p.value.horasRequeridas);
const esAcademico = computed(() => auth.tieneSubrol('ADMIN_ACADEMICO'));

async function cargarTareas() {
  try {
    tareas.value = await api.tareas(p.value.idPractica);
  } catch (e) {
    error(e);
  }
}

async function ejecutar(fn, mensaje) {
  trabajando.value = true;
  try {
    await fn();
    exito(mensaje);
    emit('recargar');
  } catch (e) {
    error(e);
  } finally {
    trabajando.value = false;
  }
}

async function solicitarCierre() {
  const ok = await confirmar({
    titulo: 'Solicitar cierre',
    mensaje: 'Administración revisará tu práctica para cerrarla. Mientras tanto no podrás registrar bitácora.',
    aceptar: 'Solicitar cierre',
  });
  if (ok) ejecutar(() => api.solicitarCierre(p.value.idPractica), 'Solicitud de cierre enviada.');
}

async function proyectoCompletado() {
  const ok = await confirmar({
    titulo: 'Proyecto completado',
    mensaje: 'Confirmas que el alumno entregó el proyecto. Administración revisará el cierre de la práctica.',
    aceptar: 'Confirmar',
  });
  if (ok) ejecutar(() => api.proyectoCompletado(p.value.idPractica), 'Se pidió el cierre a administración.');
}

function generarCartaAceptacion() {
  ejecutar(() => api.generarCartaAceptacion(p.value.idPractica), 'Carta de aceptación generada.');
}

async function resolverCierre(decision) {
  const c = cierre.value;
  if (decision === 'REABRIR' && !c.observaciones.trim()) return error('Explica por qué no se aprueba el cierre.');
  c.guardando = true;
  try {
    await api.resolverCierre(p.value.idPractica, decision, c.observaciones.trim() || null);
    exito(decision === 'CERRAR' ? 'Práctica cerrada.' : 'La práctica regresó a activa.');
    c.visible = false;
    emit('recargar');
  } catch (e) {
    error(e);
  } finally {
    c.guardando = false;
  }
}

const abrir = (fn) => fn().catch(error);

watch(() => p.value.idPractica, cargarTareas);
onMounted(cargarTareas);
</script>

<template>
  <div class="space-y-6">
    <Message v-if="p.estado === 'EN_REVISION_CIERRE'" severity="info" :closable="false">
      Esta práctica está en revisión de cierre por parte de administración.
    </Message>
    <Message v-if="rol === 'ALUMNO' && activa && p.diasSinRegistro >= 1" severity="warn" :closable="false">
      Llevas {{ p.diasSinRegistro }} día(s) sin registrar tu bitácora. Recuerda registrarla diario.
    </Message>

    <PracticaResumen :practica="p" />

    <!-- Acciones según el rol -->
    <section class="tarjeta flex flex-wrap gap-2">
      <Button label="Carta de presentación" icon="pi pi-file-pdf" outlined size="small" @click="abrir(() => cartas.verPdf(p.idCartaPresentacion))" />
      <Button
        v-if="rol !== 'ALUMNO'"
        label="Escaneo firmado"
        icon="pi pi-eye"
        outlined
        size="small"
        @click="abrir(() => cartas.verEscaneo(p.idCartaPresentacion))"
      />
      <Button
        v-if="p.idCartaAceptacion"
        label="Carta de aceptación"
        icon="pi pi-file-check"
        outlined
        size="small"
        @click="abrir(() => api.verCartaAceptacion(p.idPractica))"
      />

      <template v-if="rol === 'ALUMNO'">
        <Button
          v-if="activa && porHoras"
          v-tooltip.top="horasCompletas ? '' : `Necesitas ${p.horasRequeridas} h registradas`"
          label="Solicitar cierre"
          icon="pi pi-flag"
          size="small"
          :disabled="!horasCompletas"
          :loading="trabajando"
          @click="solicitarCierre"
        />
      </template>

      <template v-if="rol === 'OFERTADOR'">
        <Button
          v-if="!p.idCartaAceptacion && p.estado !== 'BAJA'"
          label="Generar carta de aceptación"
          icon="pi pi-file-plus"
          size="small"
          :loading="trabajando"
          @click="generarCartaAceptacion"
        />
        <Button
          v-if="activa && !porHoras"
          label="Marcar proyecto completado"
          icon="pi pi-flag"
          size="small"
          :loading="trabajando"
          @click="proyectoCompletado"
        />
        <Button
          v-if="['ACTIVA', 'EN_REVISION_CIERRE'].includes(p.estado)"
          label="Incidencias y bajas"
          icon="pi pi-exclamation-circle"
          size="small"
          severity="warn"
          text
          @click="pestana = 'reportes'"
        />
      </template>

      <template v-if="rol === 'ADMIN'">
        <Button
          v-if="p.estado === 'EN_REVISION_CIERRE' && esAcademico"
          label="Revisar cierre"
          icon="pi pi-check-square"
          size="small"
          @click="cierre = { visible: true, observaciones: '', guardando: false }"
        />
      </template>
    </section>

    <section class="tarjeta">
      <Tabs v-model:value="pestana">
        <TabList>
          <Tab value="bitacora">Bitácora</Tab>
          <Tab value="tareas">Tareas ({{ tareas.length }})</Tab>
          <Tab v-if="rol !== 'ALUMNO'" value="reportes">Incidencias y bajas</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="bitacora">
            <BitacoraPanel :practica="p" :editable="rol === 'ALUMNO' && activa" :tareas="tareas" @cambio="emit('recargar')" />
          </TabPanel>
          <TabPanel value="tareas">
            <TareasPanel :practica="p" :tareas="tareas" :rol="rol" @cambio="cargarTareas" />
          </TabPanel>
          <TabPanel v-if="rol !== 'ALUMNO'" value="reportes">
            <ReportesPractica :practica="p" :puede-registrar="rol === 'OFERTADOR'" @cambio="emit('recargar')" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </section>

    <Dialog v-model:visible="cierre.visible" modal header="Revisar cierre de práctica" class="w-full max-w-lg">
      <p class="text-sm text-slate-600 mb-3">
        {{ porHoras ? `Horas registradas: ${p.horasAcumuladas} de ${p.horasRequeridas}.` : 'Práctica por proyecto marcada como completada por el ofertador.' }}
        Revisa la bitácora y las tareas antes de cerrar.
      </p>
      <label class="flex flex-col gap-1.5 text-sm font-medium">
        Observaciones <span class="font-normal text-slate-500">(obligatorias si no apruebas el cierre)</span>
        <Textarea v-model="cierre.observaciones" rows="3" auto-resize />
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <Button label="No aprobar" icon="pi pi-undo" severity="warn" outlined :loading="cierre.guardando" @click="resolverCierre('REABRIR')" />
        <Button label="Cerrar práctica" icon="pi pi-check" severity="success" :loading="cierre.guardando" @click="resolverCierre('CERRAR')" />
      </div>
    </Dialog>
  </div>
</template>
