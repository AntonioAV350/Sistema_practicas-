<script setup>
import { computed } from 'vue';
import ProgressBar from 'primevue/progressbar';
import EstadoTag from './EstadoTag.vue';
import { fecha, nombreCompleto, estado as etiqueta } from '../utils/formato';

// Tarjeta con los datos clave de una práctica y su avance de horas
const props = defineProps({ practica: { type: Object, required: true } });

const porcentaje = computed(() => {
  const p = props.practica;
  if (!p.horasRequeridas) return null;
  return Math.min(100, Math.round((p.horasAcumuladas / p.horasRequeridas) * 100));
});
</script>

<template>
  <section class="tarjeta">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 class="text-lg font-semibold">{{ practica.titulo }}</h3>
        <p class="text-sm text-[#0b3a63] font-medium">{{ practica.empresa }}</p>
        <p class="text-sm text-slate-500">
          {{ practica.tipoPractica }}{{ practica.modalidadTrabajo ? ` · ${etiqueta(practica.modalidadTrabajo)}` : '' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <EstadoTag :estado="practica.estado" />
        <slot name="acciones" />
      </div>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
      <div>
        <div class="text-slate-500">Alumno</div>
        <div class="font-medium">{{ nombreCompleto(practica) }}</div>
        <div class="text-xs text-slate-500">{{ practica.matricula }} · {{ practica.nombreCarrera }}</div>
      </div>
      <div>
        <div class="text-slate-500">Supervisor</div>
        <div class="font-medium">{{ practica.ofertadorNombre }} {{ practica.ofertadorApellido }}</div>
        <div class="text-xs text-slate-500">{{ practica.ofertadorEmail }}</div>
      </div>
      <div>
        <div class="text-slate-500">Periodo</div>
        <div class="font-medium">{{ fecha(practica.fechaInicio) }} – {{ practica.fechaFin ? fecha(practica.fechaFin) : 'en curso' }}</div>
      </div>
      <div>
        <div class="text-slate-500">Última bitácora</div>
        <div class="font-medium" :class="{ 'text-red-600': practica.estado === 'ACTIVA' && practica.diasSinRegistro >= 3 }">
          {{ practica.ultimaFechaBitacora ? fecha(practica.ultimaFechaBitacora) : 'Sin registros' }}
          <span v-if="practica.estado === 'ACTIVA' && practica.diasSinRegistro > 0" class="text-xs">
            ({{ practica.diasSinRegistro }} día(s) sin registrar)
          </span>
        </div>
      </div>
    </div>

    <div class="mt-5">
      <div class="flex justify-between text-sm mb-1">
        <span class="font-medium">Horas registradas</span>
        <span>
          <strong>{{ practica.horasAcumuladas }}</strong>
          <template v-if="practica.horasRequeridas"> de {{ practica.horasRequeridas }} h</template>
          <template v-else> h (práctica por proyecto)</template>
        </span>
      </div>
      <ProgressBar v-if="porcentaje !== null" :value="porcentaje" class="!h-3" />
    </div>

    <p v-if="practica.observacionesCierre" class="mt-4 text-sm rounded-lg bg-slate-50 p-3">
      <strong>Observaciones de cierre:</strong> {{ practica.observacionesCierre }}
    </p>
  </section>
</template>
