<script setup>
// Mensaje para listas vacías
defineProps({
  icono: { type: String, default: 'pi pi-inbox' },
  titulo: { type: String, required: true },
  texto: { type: String, default: '' },
});
</script>

<template>
  <div class="py-10 text-center text-slate-500">
    <i :class="icono" class="text-4xl text-slate-300" />
    <p class="mt-3 font-medium text-slate-600">{{ titulo }}</p>
    <p v-if="texto" class="mt-1 text-sm">{{ texto }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
