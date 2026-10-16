<script setup>
// Tarjeta de indicador para los tableros de inicio. Si trae "to" es un enlace.
defineProps({
  valor: { type: [Number, String], default: 0 },
  etiqueta: { type: String, required: true },
  icono: { type: String, default: 'pi pi-circle' },
  to: { type: String, default: null },
  alerta: { type: Boolean, default: false },
});
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="tarjeta flex items-center gap-4"
    :class="[to ? 'hover:border-[#0b3a63] hover:shadow-sm transition' : '', alerta && Number(valor) > 0 ? '!border-amber-300 !bg-amber-50' : '']"
  >
    <span
      class="grid place-items-center h-11 w-11 shrink-0 rounded-lg"
      :class="alerta && Number(valor) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-[#0b3a63]'"
    >
      <i :class="icono" class="text-xl" />
    </span>
    <span>
      <span class="block text-2xl font-semibold text-slate-900 tabular-nums">{{ valor }}</span>
      <span class="block text-sm text-slate-500">{{ etiqueta }}</span>
    </span>
  </component>
</template>
