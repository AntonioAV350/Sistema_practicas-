<script setup>
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Message from 'primevue/message';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import Vacio from '../../components/Vacio.vue';
import * as api from '../../services/vacantes';
import { tiposPractica as cargarTipos } from '../../services/catalogos';
import { useAviso } from '../../composables/useAviso';
import { fecha, estado as etiqueta } from '../../utils/formato';

// SIGEA-30: el alumno ve las vacantes abiertas y se postula
const { exito, error, confirmar } = useAviso();
const vacantes = ref([]);
const tipos = ref([]);
const eleg = ref(null);
const cargando = ref(true);
const filtros = ref({ q: '', idTipoPractica: null, modalidad: null });
const detalle = ref(null);
const postulando = ref(false);

const MODALIDADES = ['PRESENCIAL', 'REMOTO', 'MIXTO'].map((m) => ({ label: etiqueta(m), value: m }));

async function cargar() {
  cargando.value = true;
  try {
    const f = filtros.value;
    vacantes.value = await api.abiertas({
      q: f.q || undefined,
      idTipoPractica: f.idTipoPractica || undefined,
      modalidad: f.modalidad || undefined,
    });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function postular(v) {
  const ok = await confirmar({
    titulo: 'Postularme',
    mensaje: `¿Quieres postularte a "${v.titulo}" en ${v.empresa}? El ofertador verá tus datos académicos.`,
    aceptar: 'Postularme',
  });
  if (!ok) return;
  postulando.value = true;
  try {
    await api.postular(v.idVacante);
    exito('Te postulaste. Te avisaremos cuando el ofertador responda.');
    detalle.value = null;
    cargar();
  } catch (e) {
    error(e);
  } finally {
    postulando.value = false;
  }
}

onMounted(async () => {
  cargar();
  try {
    [eleg.value, tipos.value] = await Promise.all([api.elegibilidad(), cargarTipos()]);
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <Encabezado titulo="Vacantes disponibles" descripcion="Postúlate a las que te interesen; puedes tener varias postulaciones a la vez." />

  <Message v-if="eleg && !eleg.puede" severity="warn" :closable="false" class="mb-5">
    {{ eleg.motivo }}
    <RouterLink v-if="!eleg.cartaAprobada" to="/alumno/carta" class="ml-1 font-semibold underline">Ir a mi carta</RouterLink>
  </Message>

  <div class="mb-5 flex flex-wrap gap-3">
    <span class="relative">
      <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <InputText v-model="filtros.q" placeholder="Puesto, empresa o palabra clave" class="pl-9 w-72" @keyup.enter="cargar" />
    </span>
    <Select v-model="filtros.idTipoPractica" :options="tipos" option-label="nombre" option-value="idTipoPractica" placeholder="Tipo de práctica" show-clear @change="cargar" />
    <Select v-model="filtros.modalidad" :options="MODALIDADES" option-label="label" option-value="value" placeholder="Modalidad" show-clear @change="cargar" />
  </div>

  <div v-if="cargando" class="text-slate-500">Cargando vacantes…</div>
  <div v-else-if="!vacantes.length" class="tarjeta">
    <Vacio icono="pi pi-briefcase" titulo="No hay vacantes abiertas con esos filtros" texto="Vuelve a revisar pronto." />
  </div>

  <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <article v-for="v in vacantes" :key="v.idVacante" class="tarjeta flex flex-col">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold text-slate-900">{{ v.titulo }}</h3>
        <EstadoTag v-if="v.miPostulacionEstado" :estado="v.miPostulacionEstado" />
      </div>
      <p class="text-sm text-[#0b3a63] font-medium">{{ v.empresa }}</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <Tag :value="v.tipoPractica" severity="secondary" />
        <Tag v-if="v.modalidadTrabajo" :value="etiqueta(v.modalidadTrabajo)" severity="secondary" />
        <Tag :value="`${v.cupoDisponible} lugar(es)`" severity="info" />
      </div>
      <p class="mt-3 text-sm text-slate-600 line-clamp-3 flex-1">{{ v.descripcion }}</p>
      <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{{ v.cierraEn ? `Cierra ${fecha(v.cierraEn)}` : `Publicada ${fecha(v.publicadaEn)}` }}</span>
        <Button label="Ver detalle" size="small" text @click="detalle = v" />
      </div>
    </article>
  </div>

  <Dialog :visible="!!detalle" modal :header="detalle?.titulo" class="w-full max-w-2xl" @update:visible="detalle = null">
    <template v-if="detalle">
      <p class="font-medium text-[#0b3a63]">{{ detalle.empresa }}</p>
      <p v-if="detalle.empresaDireccion" class="text-sm text-slate-500">{{ detalle.empresaDireccion }}</p>
      <div class="my-3 flex flex-wrap gap-2">
        <Tag :value="detalle.tipoPractica + (detalle.horasRequeridas ? ` · ${detalle.horasRequeridas} h` : '')" severity="secondary" />
        <Tag v-if="detalle.modalidadTrabajo" :value="etiqueta(detalle.modalidadTrabajo)" severity="secondary" />
        <Tag :value="`${detalle.cupoDisponible} de ${detalle.cupoTotal} lugares`" severity="info" />
      </div>
      <h4 class="mt-4 font-semibold text-sm">Descripción</h4>
      <p class="text-sm whitespace-pre-line text-slate-700">{{ detalle.descripcion }}</p>
      <template v-if="detalle.requisitos">
        <h4 class="mt-4 font-semibold text-sm">Requisitos</h4>
        <p class="text-sm whitespace-pre-line text-slate-700">{{ detalle.requisitos }}</p>
      </template>
      <p class="mt-4 text-xs text-slate-500">
        Ofertador: {{ detalle.ofertadorNombre }} {{ detalle.ofertadorApellido }} ·
        {{ detalle.cierraEn ? `Cierra el ${fecha(detalle.cierraEn)}` : 'Sin fecha de cierre' }}
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <Button label="Cerrar" severity="secondary" outlined @click="detalle = null" />
        <Button
          v-if="!detalle.miPostulacion"
          label="Postularme"
          icon="pi pi-send"
          :disabled="eleg && !eleg.puede"
          :loading="postulando"
          @click="postular(detalle)"
        />
        <span v-else class="self-center text-sm text-slate-600">Ya te postulaste a esta vacante.</span>
      </div>
    </template>
  </Dialog>
</template>
