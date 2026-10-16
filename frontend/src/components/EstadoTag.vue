<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';
import { estado as etiqueta } from '../utils/formato';

// Etiqueta de color para cualquier estado del sistema
const props = defineProps({ estado: { type: String, default: '' } });

const SEVERIDAD = {
  success: ['APROBADA', 'CONFIRMADA', 'ACTIVA', 'COMPLETADA', 'RESUELTA', 'RESUELTA_SIN_BAJA', 'ABIERTA_VACANTE'],
  info: ['GENERADA', 'POSTULADA', 'ACEPTADA', 'ENTREGADA', 'ESCANEO_SUBIDO', 'ABIERTA'],
  warn: ['PENDIENTE', 'EN_REVISION_CIERRE', 'EN_REVISION_ACADEMICA', 'ESCALADA'],
  danger: ['RECHAZADA', 'CANCELADA', 'BAJA', 'EXPIRADA', 'RECHAZADA_ALUMNO', 'CANCELADA_OFERTADOR'],
};

const severidad = computed(
  () => Object.keys(SEVERIDAD).find((s) => SEVERIDAD[s].includes(props.estado)) || 'secondary',
);
</script>

<template>
  <Tag v-if="estado" :value="etiqueta(estado)" :severity="severidad" />
</template>
