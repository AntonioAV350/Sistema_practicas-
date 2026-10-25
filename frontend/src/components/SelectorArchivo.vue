<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';

// Selector de archivo simple (PDF/JPG/PNG, máx. 5 MB) con validación en el cliente
const archivo = defineModel({ type: Object, default: null });
defineProps({ disabled: Boolean });

const input = ref();
const error = ref('');
const MAX = 5 * 1024 * 1024;
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png'];

function elegir(e) {
  const f = e.target.files?.[0];
  error.value = '';
  if (!f) return;
  if (!TIPOS.includes(f.type)) error.value = 'Solo PDF, JPG o PNG.';
  else if (f.size > MAX) error.value = 'El archivo pesa más de 5 MB.';
  archivo.value = error.value ? null : f;
  e.target.value = '';
}
</script>

<template>
  <div>
    <input ref="input" type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" @change="elegir" />
    <div class="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        icon="pi pi-paperclip"
        label="Elegir archivo"
        severity="secondary"
        outlined
        :disabled="disabled"
        @click="input.click()"
      />
      <span class="text-sm text-slate-600 truncate max-w-xs">
        {{ archivo ? archivo.name : 'Ningún archivo seleccionado' }}
      </span>
    </div>
    <small v-if="error" class="text-red-600">{{ error }}</small>
  </div>
</template>
