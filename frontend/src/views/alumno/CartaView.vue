<script setup>
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import SelectorArchivo from '../../components/SelectorArchivo.vue';
import * as api from '../../services/cartas';
import { useAviso } from '../../composables/useAviso';
import { fechaHora } from '../../utils/formato';

// Carta de presentación: paso obligatorio antes de postularse.
// Generar PDF -> imprimir, sellar y firmar -> subir escaneo -> revisión del admin documental.
const { exito, error, confirmar } = useAviso();
const cartas = ref([]);
const cargando = ref(true);
const trabajando = ref(false);
const archivo = ref(null);

const actual = computed(() => cartas.value[0] ?? null);
const anteriores = computed(() => cartas.value.slice(1));
const puedeGenerar = computed(() => !actual.value || actual.value.estado === 'RECHAZADA');
const puedeSubir = computed(() => ['GENERADA', 'ESCANEO_SUBIDO'].includes(actual.value?.estado));

const PASOS = [
  { estado: 'GENERADA', titulo: 'Genera tu carta', texto: 'El sistema crea el PDF con tus datos.' },
  { estado: 'IMPRESA', titulo: 'Imprime, sella y firma', texto: 'Llévala a la coordinación para el sello y la firma.' },
  { estado: 'ESCANEO_SUBIDO', titulo: 'Sube el escaneo', texto: 'PDF, JPG o PNG de máximo 5 MB.' },
  { estado: 'APROBADA', titulo: 'Revisión', texto: 'El Administrador Documental la aprueba o la rechaza.' },
];
const pasoActual = computed(() => {
  const e = actual.value?.estado;
  if (!e || e === 'RECHAZADA') return 0;
  if (e === 'GENERADA') return 1;
  if (e === 'ESCANEO_SUBIDO') return 3;
  return 4;
});

async function cargar() {
  try {
    cartas.value = await api.misCartas();
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function generar() {
  trabajando.value = true;
  try {
    await api.generar();
    exito('Tu carta se generó. Descárgala para imprimirla.');
    await cargar();
  } catch (e) {
    error(e);
  } finally {
    trabajando.value = false;
  }
}

async function subir() {
  if (!archivo.value) return;
  if (actual.value.estado === 'ESCANEO_SUBIDO') {
    const ok = await confirmar({ mensaje: 'Ya subiste un escaneo. ¿Quieres reemplazarlo por el nuevo archivo?' });
    if (!ok) return;
  }
  trabajando.value = true;
  try {
    await api.subirEscaneo(actual.value.idCarta, archivo.value);
    archivo.value = null;
    exito('Escaneo enviado. Te avisaremos cuando lo revisen.');
    await cargar();
  } catch (e) {
    error(e);
  } finally {
    trabajando.value = false;
  }
}

const ver = (fn) => fn().catch(error);

onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Carta de presentación"
    descripcion="Necesitas tu carta aprobada para poder postularte a vacantes."
  />

  <div v-if="!cargando" class="grid gap-6 lg:grid-cols-3">
    <section class="tarjeta lg:col-span-2">
      <ol class="grid gap-4 sm:grid-cols-4 mb-6">
        <li v-for="(p, i) in PASOS" :key="p.estado" class="flex gap-3 sm:flex-col">
          <span
            class="grid place-items-center h-8 w-8 shrink-0 rounded-full text-sm font-semibold"
            :class="i < pasoActual ? 'bg-emerald-600 text-white' : i === pasoActual ? 'bg-[#0b3a63] text-white' : 'bg-slate-200 text-slate-500'"
          >
            <i v-if="i < pasoActual" class="pi pi-check text-xs" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span>
            <span class="block text-sm font-semibold">{{ p.titulo }}</span>
            <span class="block text-xs text-slate-500">{{ p.texto }}</span>
          </span>
        </li>
      </ol>

      <Message v-if="actual?.estado === 'RECHAZADA'" severity="error" :closable="false" class="mb-4">
        Tu carta fue rechazada: <strong>{{ actual.comentarios }}</strong>. Corrige lo necesario y genera una nueva.
      </Message>
      <Message v-if="actual?.estado === 'APROBADA'" severity="success" :closable="false" class="mb-4">
        ¡Tu carta fue aprobada! Ya puedes postularte a vacantes.
      </Message>
      <Message v-if="actual?.estado === 'ESCANEO_SUBIDO'" severity="info" :closable="false" class="mb-4">
        Tu escaneo está en revisión. Mientras no la revisen puedes reemplazar el archivo.
      </Message>

      <div v-if="puedeGenerar" class="flex flex-col items-start gap-3">
        <p class="text-sm text-slate-600">
          Revisa que tus datos estén correctos en <RouterLink to="/alumno/datos" class="text-[#0b3a63] underline">Mis datos</RouterLink>
          antes de generarla.
        </p>
        <Button label="Generar carta de presentación" icon="pi pi-file-plus" :loading="trabajando" @click="generar" />
      </div>

      <div v-else class="space-y-5">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-slate-600">Folio <strong>{{ actual.folio }}</strong></span>
          <EstadoTag :estado="actual.estado" />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button label="Descargar PDF" icon="pi pi-download" outlined @click="ver(() => api.verPdf(actual.idCarta))" />
          <Button
            v-if="actual.tieneEscaneo"
            label="Ver escaneo subido"
            icon="pi pi-eye"
            text
            @click="ver(() => api.verEscaneo(actual.idCarta))"
          />
        </div>

        <div v-if="puedeSubir" class="rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
          <p class="text-sm font-medium">Sube tu carta sellada y firmada</p>
          <SelectorArchivo v-model="archivo" :disabled="trabajando" />
          <Button label="Enviar escaneo" icon="pi pi-upload" :disabled="!archivo" :loading="trabajando" @click="subir" />
        </div>
      </div>
    </section>

    <section class="tarjeta">
      <h3 class="font-semibold mb-3">Historial</h3>
      <p v-if="!cartas.length" class="text-sm text-slate-500">Aún no has generado ninguna carta.</p>
      <div v-for="c in cartas" :key="c.idCarta" class="py-2 border-b border-slate-100 last:border-0 text-sm">
        <div class="flex justify-between gap-2">
          <span>{{ c.folio }}</span>
          <EstadoTag :estado="c.estado" />
        </div>
        <div class="text-xs text-slate-500">Generada {{ fechaHora(c.generadaEn) }}</div>
        <div v-if="c.comentarios" class="text-xs text-slate-600 mt-1">“{{ c.comentarios }}”</div>
      </div>
      <p v-if="anteriores.length" class="mt-2 text-xs text-slate-400">Las cartas rechazadas se conservan como historial.</p>
    </section>
  </div>
</template>
