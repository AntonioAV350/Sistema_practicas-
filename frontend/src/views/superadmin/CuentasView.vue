<script setup>
import { onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Password from 'primevue/password';
import Encabezado from '../../components/Encabezado.vue';
import CuentaDialog from './CuentaDialog.vue';
import * as api from '../../services/cuentas';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';
import { nombreCompleto, rol as etiquetaRol, estado as etiquetaEstado } from '../../utils/formato';

// SIGEA-10/28: administración de cuentas. Alta de admins y ofertadores,
// edición, activar/desactivar y restablecer contraseña. Los alumnos se registran solos.
const auth = useAuthStore();
const { exito, error, confirmar } = useAviso();

const cuentas = ref([]);
const empresas = ref([]);
const cargando = ref(false);
const filtroRol = ref(null);
const busqueda = ref('');
const dialogo = ref({ visible: false, tipo: 'ADMIN', cuenta: null });
const reset = ref({ visible: false, cuenta: null, password: '', guardando: false });

const FILTROS = [
  { label: 'Todas', value: null },
  { label: 'Administradores', value: 'ADMIN' },
  { label: 'Ofertadores', value: 'OFERTADOR' },
  { label: 'Alumnos', value: 'ESTUDIANTE' },
  { label: 'Superadmin', value: 'SUPERADMIN' },
];

async function cargar() {
  cargando.value = true;
  try {
    cuentas.value = await api.listar({ rol: filtroRol.value || undefined, q: busqueda.value || undefined });
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

const etiquetaRoles = (c) => c.roles.map((r) => etiquetaRol(r.subrol || r.rol)).join(', ');
const tipoCuenta = (c) => (c.roles.some((r) => r.rol === 'OFERTADOR') ? 'OFERTADOR' : 'ADMIN');
const editable = (c) => c.roles.some((r) => r.rol === 'ADMIN' || r.rol === 'OFERTADOR');

function nueva(tipo) {
  dialogo.value = { visible: true, tipo, cuenta: null };
}

function editar(c) {
  dialogo.value = { visible: true, tipo: tipoCuenta(c), cuenta: c };
}

async function alternarActivo(c) {
  const accion = c.activo ? 'desactivar' : 'activar';
  const ok = await confirmar({
    titulo: `${c.activo ? 'Desactivar' : 'Activar'} cuenta`,
    mensaje: `¿Seguro que quieres ${accion} la cuenta de ${nombreCompleto(c)}?${c.activo ? ' Ya no podrá iniciar sesión.' : ''}`,
    aceptar: c.activo ? 'Desactivar' : 'Activar',
    peligro: c.activo,
  });
  if (!ok) return;
  try {
    await api.cambiarActivo(c.idUsuario, !c.activo);
    c.activo = !c.activo;
    exito(`Cuenta ${c.activo ? 'activada' : 'desactivada'}.`);
  } catch (e) {
    error(e);
  }
}

async function guardarPassword() {
  if (reset.value.password.length < 8) return error('La contraseña debe tener al menos 8 caracteres.');
  reset.value.guardando = true;
  try {
    await api.restablecerPassword(reset.value.cuenta.idUsuario, reset.value.password);
    exito('Contraseña restablecida. Compártela con el usuario por un medio seguro.');
    reset.value.visible = false;
  } catch (e) {
    error(e);
  } finally {
    reset.value.guardando = false;
  }
}

onMounted(async () => {
  cargar();
  try {
    empresas.value = await api.empresas();
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <Encabezado titulo="Cuentas" descripcion="Administradores, ofertadores y alumnos del sistema.">
    <Button label="Nuevo administrador" icon="pi pi-user-plus" @click="nueva('ADMIN')" />
    <Button label="Nuevo ofertador" icon="pi pi-briefcase" outlined @click="nueva('OFERTADOR')" />
  </Encabezado>

  <div class="tarjeta">
    <div class="mb-4 flex flex-wrap gap-3 items-center">
      <SelectButton v-model="filtroRol" :options="FILTROS" option-label="label" option-value="value" :allow-empty="false" @change="cargar" />
      <span class="relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText v-model="busqueda" placeholder="Buscar por nombre o correo" class="pl-9" @keyup.enter="cargar" />
      </span>
    </div>

    <DataTable :value="cuentas" :loading="cargando" data-key="idUsuario" paginator :rows="15" striped-rows size="small">
      <template #empty>No hay cuentas con ese filtro.</template>
      <Column header="Nombre">
        <template #body="{ data }">
          <div class="font-medium">{{ nombreCompleto(data) }}</div>
          <div class="text-xs text-slate-500">{{ data.email }}</div>
        </template>
      </Column>
      <Column header="Rol">
        <template #body="{ data }">{{ etiquetaRoles(data) }}</template>
      </Column>
      <Column header="Detalle">
        <template #body="{ data }">
          <span v-if="data.tipoOfertador">{{ etiquetaEstado(data.tipoOfertador) }}<template v-if="data.empresa"> · {{ data.empresa }}</template></span>
          <span v-else-if="data.matricula">Matrícula {{ data.matricula }}</span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <Tag :value="data.activo ? 'Activa' : 'Inactiva'" :severity="data.activo ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column header="" class="text-right whitespace-nowrap">
        <template #body="{ data }">
          <Button v-if="editable(data)" v-tooltip.top="'Editar'" icon="pi pi-pencil" text rounded @click="editar(data)" />
          <Button
            v-tooltip.top="'Restablecer contraseña'"
            icon="pi pi-key"
            text
            rounded
            @click="reset = { visible: true, cuenta: data, password: '', guardando: false }"
          />
          <Button
            v-if="data.idUsuario !== auth.usuario?.id"
            v-tooltip.top="data.activo ? 'Desactivar' : 'Activar'"
            :icon="data.activo ? 'pi pi-ban' : 'pi pi-check-circle'"
            :severity="data.activo ? 'danger' : 'success'"
            text
            rounded
            @click="alternarActivo(data)"
          />
        </template>
      </Column>
    </DataTable>
  </div>

  <CuentaDialog
    v-model:visible="dialogo.visible"
    :tipo="dialogo.tipo"
    :cuenta="dialogo.cuenta"
    :empresas="empresas"
    @guardada="cargar"
  />

  <Dialog v-model:visible="reset.visible" modal header="Restablecer contraseña" class="w-full max-w-md">
    <p class="mb-3 text-sm text-slate-600">
      Nueva contraseña para <strong>{{ nombreCompleto(reset.cuenta) }}</strong>:
    </p>
    <Password v-model="reset.password" :feedback="false" toggle-mask fluid />
    <div class="mt-4 flex justify-end gap-2">
      <Button label="Cancelar" severity="secondary" outlined @click="reset.visible = false" />
      <Button label="Restablecer" icon="pi pi-key" :loading="reset.guardando" @click="guardarPassword" />
    </div>
  </Dialog>
</template>
