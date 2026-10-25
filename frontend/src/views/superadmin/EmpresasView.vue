<script setup>
import { onMounted, reactive, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Tag from 'primevue/tag';
import Encabezado from '../../components/Encabezado.vue';
import * as api from '../../services/cuentas';
import { useAviso } from '../../composables/useAviso';

// Catálogo de empresas a las que pertenecen los ofertadores externos
const { exito, error } = useAviso();
const empresas = ref([]);
const cargando = ref(false);
const dialogo = ref({ visible: false, id: null, guardando: false });
const form = reactive({});

async function cargar() {
  cargando.value = true;
  try {
    empresas.value = await api.empresas();
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

function abrir(e = null) {
  Object.assign(form, {
    nombre: e?.nombre ?? '',
    descripcion: e?.descripcion ?? '',
    direccion: e?.direccion ?? '',
    telefono: e?.telefono ?? '',
    correo: e?.correo ?? '',
    contactoNombre: e?.contactoNombre ?? '',
    contactoPuesto: e?.contactoPuesto ?? '',
    activa: e?.activa ?? true,
  });
  dialogo.value = { visible: true, id: e?.idEmpresa ?? null, guardando: false };
}

async function guardar() {
  if (!form.nombre.trim()) return error('El nombre es obligatorio.');
  dialogo.value.guardando = true;
  try {
    if (dialogo.value.id) await api.actualizarEmpresa(dialogo.value.id, { ...form });
    else await api.crearEmpresa({ ...form });
    exito('Empresa guardada.');
    dialogo.value.visible = false;
    cargar();
  } catch (e) {
    error(e);
  } finally {
    dialogo.value.guardando = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado titulo="Empresas" descripcion="Empresas externas que ofrecen prácticas.">
    <Button label="Nueva empresa" icon="pi pi-plus" @click="abrir()" />
  </Encabezado>

  <div class="tarjeta">
    <DataTable :value="empresas" :loading="cargando" data-key="idEmpresa" paginator :rows="15" size="small" striped-rows>
      <template #empty>Aún no hay empresas registradas.</template>
      <Column field="nombre" header="Empresa" sortable />
      <Column header="Contacto">
        <template #body="{ data }">
          <div>{{ data.contactoNombre || '—' }}</div>
          <div class="text-xs text-slate-500">{{ data.correo }} {{ data.telefono }}</div>
        </template>
      </Column>
      <Column field="ofertadores" header="Ofertadores" />
      <Column header="Estado">
        <template #body="{ data }">
          <Tag :value="data.activa ? 'Activa' : 'Inactiva'" :severity="data.activa ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column header="" class="text-right">
        <template #body="{ data }">
          <Button v-tooltip.top="'Editar'" icon="pi pi-pencil" text rounded @click="abrir(data)" />
        </template>
      </Column>
    </DataTable>
  </div>

  <Dialog v-model:visible="dialogo.visible" modal :header="dialogo.id ? 'Editar empresa' : 'Nueva empresa'" class="w-full max-w-2xl">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <label class="campo sm:col-span-2">Nombre <InputText v-model="form.nombre" /></label>
      <label class="campo sm:col-span-2">Descripción <Textarea v-model="form.descripcion" rows="2" auto-resize /></label>
      <label class="campo sm:col-span-2">Dirección <InputText v-model="form.direccion" /></label>
      <label class="campo">Teléfono <InputText v-model="form.telefono" /></label>
      <label class="campo">Correo <InputText v-model="form.correo" type="email" /></label>
      <label class="campo">Nombre del contacto <InputText v-model="form.contactoNombre" /></label>
      <label class="campo">Puesto del contacto <InputText v-model="form.contactoPuesto" /></label>
      <label class="flex items-center gap-3 text-sm">
        <ToggleSwitch v-model="form.activa" /> Empresa activa
      </label>
      <div class="sm:col-span-2 flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined @click="dialogo.visible = false" />
        <Button type="submit" label="Guardar" icon="pi pi-save" :loading="dialogo.guardando" />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
</style>
