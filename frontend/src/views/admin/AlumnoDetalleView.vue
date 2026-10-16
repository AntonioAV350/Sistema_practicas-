<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import Vacio from '../../components/Vacio.vue';
import * as api from '../../services/alumnos';
import { useAviso } from '../../composables/useAviso';
import { fecha, fechaHora, nombreCompleto } from '../../utils/formato';

const route = useRoute();
const { error } = useAviso();
const alumno = ref(null);
const base = `/${route.path.split('/')[1]}`;

onMounted(async () => {
  try {
    alumno.value = await api.detalle(route.params.id);
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <template v-if="alumno">
    <Encabezado :titulo="nombreCompleto(alumno)" :descripcion="`${alumno.matricula} · ${alumno.nombreCarrera}`">
      <Button label="Volver" icon="pi pi-arrow-left" text @click="$router.back()" />
    </Encabezado>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="tarjeta">
        <h3 class="font-semibold mb-3">Datos</h3>
        <dl class="text-sm space-y-2">
          <div><dt class="text-slate-500">Correo</dt><dd>{{ alumno.email }}</dd></div>
          <div><dt class="text-slate-500">Teléfono</dt><dd>{{ alumno.telefono || '—' }}</dd></div>
          <div>
            <dt class="text-slate-500">Periodo / grupo</dt>
            <dd>{{ alumno.numeroPeriodo ? `${alumno.numeroPeriodo}°` : 'Sin inscripción vigente' }} · {{ alumno.grupo }}</dd>
          </div>
          <div><dt class="text-slate-500">Ciclo</dt><dd>{{ alumno.cicloActual || '—' }}</dd></div>
        </dl>
      </section>

      <section class="tarjeta lg:col-span-2">
        <h3 class="font-semibold mb-3">Prácticas</h3>
        <Vacio v-if="!alumno.practicas.length" titulo="Sin prácticas" />
        <RouterLink
          v-for="p in alumno.practicas"
          :key="p.idPractica"
          :to="`${base}/practicas/${p.idPractica}`"
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 mb-2 hover:bg-slate-50"
        >
          <div>
            <div class="font-medium">{{ p.titulo }}</div>
            <div class="text-xs text-slate-500">
              {{ fecha(p.fechaInicio) }} – {{ fecha(p.fechaFin) }} ·
              {{ p.horasAcumuladas }}{{ p.horasRequeridas ? ` / ${p.horasRequeridas}` : '' }} h
            </div>
          </div>
          <EstadoTag :estado="p.estado" />
        </RouterLink>
      </section>

      <section class="tarjeta">
        <h3 class="font-semibold mb-3">Cartas de presentación</h3>
        <Vacio v-if="!alumno.cartas.length" titulo="Sin cartas" />
        <div v-for="c in alumno.cartas" :key="c.idCarta" class="border-b border-slate-100 py-2 last:border-0 text-sm">
          <div class="flex justify-between"><span>{{ fechaHora(c.generadaEn) }}</span><EstadoTag :estado="c.estado" /></div>
          <p v-if="c.comentarios" class="text-xs text-slate-500 mt-1">{{ c.comentarios }}</p>
        </div>
      </section>

      <section class="tarjeta lg:col-span-2">
        <h3 class="font-semibold mb-3">Postulaciones</h3>
        <Vacio v-if="!alumno.postulaciones.length" titulo="Sin postulaciones" />
        <div
          v-for="p in alumno.postulaciones"
          :key="p.idPostulacion"
          class="flex justify-between border-b border-slate-100 py-2 last:border-0 text-sm"
        >
          <span>{{ p.titulo }} <span class="text-xs text-slate-500">· {{ fecha(p.postuladaEn) }}</span></span>
          <span class="flex gap-2"><EstadoTag :estado="p.estado" /><EstadoTag :estado="p.estadoAceptacion" /></span>
        </div>
      </section>
    </div>
  </template>
</template>
