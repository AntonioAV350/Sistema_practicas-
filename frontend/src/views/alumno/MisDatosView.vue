<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Encabezado from '../../components/Encabezado.vue';
import * as api from '../../services/alumnos';
import { carreras as cargarCarreras } from '../../services/catalogos';
import { useAuthStore } from '../../stores/auth';
import { useAviso } from '../../composables/useAviso';

// SIGEA-31: datos personales y académicos que se imprimen en la carta de presentación
const auth = useAuthStore();
const { exito, error } = useAviso();
const perfil = ref(null);
const carreras = ref([]);
const guardando = ref(false);
const form = reactive({});

const carrera = computed(() => carreras.value.find((c) => c.idCarrera === form.idCarrera));
const periodos = computed(() =>
  Array.from({ length: carrera.value?.totalPeriodos ?? 0 }, (_, i) => ({ label: `${i + 1}°`, value: i + 1 })),
);

function llenar(p) {
  perfil.value = p;
  Object.assign(form, {
    nombre: p.nombre,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno ?? '',
    telefono: p.telefono ?? '',
    matricula: p.matricula,
    idCarrera: p.idCarrera,
    numeroPeriodo: p.numeroPeriodo,
    grupo: p.grupo,
  });
}

async function guardar() {
  guardando.value = true;
  try {
    const p = await api.actualizarMisDatos({ ...form });
    llenar(p);
    auth.actualizarUsuario({ nombre: p.nombre, apellidoPaterno: p.apellidoPaterno, apellidoMaterno: p.apellidoMaterno });
    exito('Tus datos se guardaron.');
  } catch (e) {
    error(e);
  } finally {
    guardando.value = false;
  }
}

onMounted(async () => {
  try {
    const [p, c] = await Promise.all([api.miPerfil(), cargarCarreras()]);
    carreras.value = c;
    llenar(p);
  } catch (e) {
    error(e);
  }
});
</script>

<template>
  <Encabezado titulo="Mis datos" descripcion="Revisa que tus datos estén correctos antes de generar tu carta de presentación." />

  <div v-if="perfil" class="tarjeta max-w-3xl">
    <Message v-if="!perfil.numeroPeriodo" severity="warn" :closable="false" class="mb-5">
      No tienes registrado el periodo que cursas en el ciclo actual. Indícalo para poder postularte.
    </Message>

    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <label class="campo">Nombre(s) <InputText v-model="form.nombre" /></label>
      <label class="campo">Apellido paterno <InputText v-model="form.apellidoPaterno" /></label>
      <label class="campo">Apellido materno <InputText v-model="form.apellidoMaterno" /></label>
      <label class="campo">Teléfono <InputText v-model="form.telefono" /></label>
      <label class="campo sm:col-span-2">
        Correo
        <InputText :model-value="perfil.email" disabled />
      </label>

      <h3 class="sm:col-span-2 mt-2 font-semibold text-slate-700">Datos académicos</h3>
      <label class="campo">Matrícula <InputText v-model="form.matricula" /></label>
      <label class="campo">
        Carrera
        <Select v-model="form.idCarrera" :options="carreras" option-label="nombreCarrera" option-value="idCarrera" />
      </label>
      <label class="campo">
        Periodo que cursas <span class="text-slate-400 font-normal">(ciclo {{ perfil.cicloActual || 'sin ciclo vigente' }})</span>
        <Select v-model="form.numeroPeriodo" :options="periodos" option-label="label" option-value="value" placeholder="Elige" />
      </label>
      <label class="campo">Grupo <InputText v-model="form.grupo" /></label>

      <p class="sm:col-span-2 text-xs text-slate-500">
        Puedes iniciar prácticas desde el periodo {{ carrera?.periodoMinimoPracticas ?? '—' }}. La matrícula y la carrera
        ya no se pueden cambiar después de generar tu primera carta.
      </p>

      <div class="sm:col-span-2 flex justify-end">
        <Button type="submit" label="Guardar cambios" icon="pi pi-save" :loading="guardando" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
</style>
