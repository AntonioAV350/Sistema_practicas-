<script setup>
import { computed, reactive, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import * as api from '../../services/cuentas';
import { useAviso } from '../../composables/useAviso';

// Alta o edición de una cuenta de administrador u ofertador (SIGEA-26/27)
const visible = defineModel('visible', { type: Boolean, default: false });
const props = defineProps({
  tipo: { type: String, required: true }, // 'ADMIN' | 'OFERTADOR'
  cuenta: { type: Object, default: null }, // null = nueva
  empresas: { type: Array, default: () => [] },
});
const emit = defineEmits(['guardada']);
const { exito, error } = useAviso();

const guardando = ref(false);
const errores = reactive({});
const form = reactive({});

const esNueva = computed(() => !props.cuenta);
const titulo = computed(
  () => `${esNueva.value ? 'Nuevo' : 'Editar'} ${props.tipo === 'ADMIN' ? 'administrador' : 'ofertador'}`,
);
const empresasActivas = computed(() => props.empresas.filter((e) => e.activa || e.idEmpresa === form.idEmpresa));

watch(visible, (v) => {
  if (!v) return;
  const c = props.cuenta ?? {};
  for (const k of Object.keys(errores)) delete errores[k];
  Object.assign(form, {
    nombre: c.nombre ?? '',
    apellidoPaterno: c.apellidoPaterno ?? '',
    apellidoMaterno: c.apellidoMaterno ?? '',
    email: c.email ?? '',
    telefono: c.telefono ?? '',
    password: '',
    subrol: c.roles?.find((r) => r.rol === 'ADMIN')?.subrol ?? 'ADMIN_ACADEMICO',
    tipo: c.tipoOfertador ?? 'EXTERNO',
    idEmpresa: c.idEmpresa ?? null,
    puesto: c.puesto ?? '',
  });
});

function validar() {
  for (const k of Object.keys(errores)) delete errores[k];
  if (!form.nombre.trim()) errores.nombre = 'Obligatorio';
  if (!form.apellidoPaterno.trim()) errores.apellidoPaterno = 'Obligatorio';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errores.email = 'Correo inválido';
  if (esNueva.value && form.password.length < 8) errores.password = 'Mínimo 8 caracteres';
  if (props.tipo === 'OFERTADOR' && form.tipo === 'EXTERNO' && !form.idEmpresa) errores.idEmpresa = 'Elige la empresa';
  return !Object.keys(errores).length;
}

async function guardar() {
  if (!validar()) return;
  guardando.value = true;
  const base = {
    nombre: form.nombre,
    apellidoPaterno: form.apellidoPaterno,
    apellidoMaterno: form.apellidoMaterno,
    email: form.email.trim(),
    telefono: form.telefono,
  };
  const extra =
    props.tipo === 'ADMIN'
      ? { subrol: form.subrol }
      : { tipo: form.tipo, idEmpresa: form.tipo === 'EXTERNO' ? form.idEmpresa : null, puesto: form.puesto };
  try {
    if (esNueva.value) {
      const crear = props.tipo === 'ADMIN' ? api.crearAdmin : api.crearOfertador;
      await crear({ ...base, ...extra, password: form.password });
      exito('La cuenta se creó.');
    } else {
      await api.actualizar(props.cuenta.idUsuario, { ...base, ...extra });
      exito('La cuenta se actualizó.');
    }
    visible.value = false;
    emit('guardada');
  } catch (e) {
    error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="titulo" class="w-full max-w-2xl">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <label class="campo">
        Nombre(s)
        <InputText v-model="form.nombre" :invalid="!!errores.nombre" />
      </label>
      <label class="campo">
        Apellido paterno
        <InputText v-model="form.apellidoPaterno" :invalid="!!errores.apellidoPaterno" />
      </label>
      <label class="campo">Apellido materno <InputText v-model="form.apellidoMaterno" /></label>
      <label class="campo">Teléfono <InputText v-model="form.telefono" /></label>
      <label class="campo sm:col-span-2">
        Correo
        <InputText v-model="form.email" type="email" :invalid="!!errores.email" />
        <small v-if="errores.email">{{ errores.email }}</small>
      </label>
      <label v-if="esNueva" class="campo sm:col-span-2">
        Contraseña inicial
        <Password v-model="form.password" :feedback="false" toggle-mask fluid :invalid="!!errores.password" />
        <small v-if="errores.password">{{ errores.password }}</small>
      </label>

      <template v-if="tipo === 'ADMIN'">
        <div class="campo sm:col-span-2">
          Tipo de administrador
          <SelectButton
            v-model="form.subrol"
            :options="[
              { label: 'Académico', value: 'ADMIN_ACADEMICO' },
              { label: 'Documental', value: 'ADMIN_DOCUMENTAL' },
            ]"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
          <span class="text-xs font-normal text-slate-500">
            Académico: supervisa avances, incidencias, bajas y cierres. Documental: revisa cartas de presentación.
          </span>
        </div>
      </template>

      <template v-else>
        <div class="campo">
          Tipo de ofertador
          <SelectButton
            v-model="form.tipo"
            :options="[
              { label: 'Empresa externa', value: 'EXTERNO' },
              { label: 'Profesor interno', value: 'INTERNO' },
            ]"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
        </div>
        <label v-if="form.tipo === 'EXTERNO'" class="campo">
          Empresa
          <Select
            v-model="form.idEmpresa"
            :options="empresasActivas"
            option-label="nombre"
            option-value="idEmpresa"
            placeholder="Elige la empresa"
            filter
            :invalid="!!errores.idEmpresa"
          />
          <small v-if="errores.idEmpresa">{{ errores.idEmpresa }}</small>
        </label>
        <label class="campo sm:col-span-2">Puesto <InputText v-model="form.puesto" /></label>
      </template>

      <div class="sm:col-span-2 flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined @click="visible = false" />
        <Button type="submit" label="Guardar" icon="pi pi-save" :loading="guardando" />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
.campo small {
  @apply font-normal text-red-600;
}
</style>
