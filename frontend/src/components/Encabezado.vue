<script setup>
// Encabezado de una vista: título, descripción y botones a la derecha
defineProps({
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
});
</script>

<template>
  <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">{{ titulo }}</h2>
      <p v-if="descripcion" class="mt-1 text-sm text-slate-500">{{ descripcion }}</p>
    </div>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </div>
</template>
