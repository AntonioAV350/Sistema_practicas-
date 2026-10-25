<script setup>
import { reactive, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { cambiarPassword } from '../services/auth';
import { useAviso } from '../composables/useAviso';

const visible = defineModel('visible', { type: Boolean, default: false });
const { exito, error } = useAviso();
const form = reactive({ actual: '', nueva: '', confirmar: '' });
const guardando = ref(false);
const problema = ref('');

async function guardar() {
  problema.value = '';
  if (form.nueva.length < 8) problema.value = 'La nueva contraseña debe tener al menos 8 caracteres.';
  else if (form.nueva !== form.confirmar) problema.value = 'Las contraseñas no coinciden.';
  if (problema.value) return;

  guardando.value = true;
  try {
    await cambiarPassword(form.actual, form.nueva);
    exito('Tu contraseña se actualizó.');
    Object.assign(form, { actual: '', nueva: '', confirmar: '' });
    visible.value = false;
  } catch (e) {
    error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Cambiar contraseña" class="w-full max-w-md">
    <form class="flex flex-col gap-4" @submit.prevent="guardar">
      <label class="flex flex-col gap-1 text-sm">
        Contraseña actual
        <Password v-model="form.actual" :feedback="false" toggle-mask fluid />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Nueva contraseña
        <Password v-model="form.nueva" :feedback="false" toggle-mask fluid />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Confirmar nueva contraseña
        <Password v-model="form.confirmar" :feedback="false" toggle-mask fluid />
      </label>
      <small v-if="problema" class="text-red-600">{{ problema }}</small>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined @click="visible = false" />
        <Button type="submit" label="Guardar" :loading="guardando" />
      </div>
    </form>
  </Dialog>
</template>
