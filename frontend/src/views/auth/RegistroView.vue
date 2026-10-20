<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { carreras as cargarCarreras } from '../../services/catalogos';
import { registrarAlumno } from '../../services/auth';
import { useAuthStore } from '../../stores/auth';
import { mensajeError } from '../../utils/errores';

// SIGEA-31: el alumno crea su cuenta con los datos que después lleva su carta
const auth = useAuthStore();
const carreras = ref([]);
const enviando = ref(false);
const errorServidor = ref('');
const errores = reactive({});
const form = reactive({
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  telefono: '',
  matricula: '',
  idCarrera: null,
  numeroPeriodo: null,
  grupo: '',
  password: '',
  confirmar: '',
});

const carrera = computed(() => carreras.value.find((c) => c.idCarrera === form.idCarrera));
const periodos = computed(() =>
  Array.from({ length: carrera.value?.totalPeriodos ?? 0 }, (_, i) => ({ label: `${i + 1}°`, value: i + 1 })),
);

function validar() {
  for (const k of Object.keys(errores)) delete errores[k];
  const req = { nombre: 'Escribe tu nombre', apellidoPaterno: 'Escribe tu apellido paterno', grupo: 'Escribe tu grupo' };
  for (const [k, msg] of Object.entries(req)) if (!form[k].trim()) errores[k] = msg;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errores.email = 'Escribe un correo válido';
  if (!/^[A-Za-z0-9-]{4,30}$/.test(form.matricula.trim())) errores.matricula = 'Matrícula inválida (letras, números o guiones)';
  if (!form.idCarrera) errores.idCarrera = 'Elige tu carrera';
  if (!form.numeroPeriodo) errores.numeroPeriodo = 'Elige el periodo que cursas';
  if (form.password.length < 8) errores.password = 'Mínimo 8 caracteres';
  else if (form.password !== form.confirmar) errores.confirmar = 'Las contraseñas no coinciden';
  return Object.keys(errores).length === 0;
}

async function enviar() {
  errorServidor.value = '';
  if (!validar() || enviando.value) return;
  enviando.value = true;
  try {
    const { confirmar, ...datos } = form;
    const r = await registrarAlumno({ ...datos, email: datos.email.trim(), matricula: datos.matricula.trim() });
    await auth.iniciarSesion(r.token, r.user);
  } catch (e) {
    errorServidor.value = mensajeError(e);
  } finally {
    enviando.value = false;
  }
}

onMounted(async () => {
  try {
    carreras.value = await cargarCarreras();
  } catch (e) {
    errorServidor.value = mensajeError(e);
  }
});
</script>

<template>
  <main class="min-h-screen bg-slate-50 py-10 px-4">
    <div class="mx-auto w-full max-w-2xl tarjeta !p-8">
      <header class="flex items-center gap-4 mb-6">
        <img src="/escudo_u.png" alt="Escudo de la UNACH" class="h-16 w-16 object-contain" />
        <div>
          <h1 class="text-2xl font-semibold text-[#0b3a63]">Crear cuenta de alumno</h1>
          <p class="text-sm text-slate-500">Tus datos se usarán para generar tu carta de presentación.</p>
        </div>
      </header>

      <Message v-if="errorServidor" severity="error" :closable="false" class="mb-5">{{ errorServidor }}</Message>

      <form novalidate class="grid gap-4 sm:grid-cols-2" @submit.prevent="enviar">
        <label class="campo">
          Nombre(s)
          <InputText v-model="form.nombre" :invalid="!!errores.nombre" />
          <small v-if="errores.nombre">{{ errores.nombre }}</small>
        </label>
        <label class="campo">
          Apellido paterno
          <InputText v-model="form.apellidoPaterno" :invalid="!!errores.apellidoPaterno" />
          <small v-if="errores.apellidoPaterno">{{ errores.apellidoPaterno }}</small>
        </label>
        <label class="campo">
          Apellido materno <span class="text-slate-400">(opcional)</span>
          <InputText v-model="form.apellidoMaterno" />
        </label>
        <label class="campo">
          Teléfono <span class="text-slate-400">(opcional)</span>
          <InputText v-model="form.telefono" />
        </label>
        <label class="campo sm:col-span-2">
          Correo institucional
          <InputText v-model="form.email" type="email" autocomplete="username" :invalid="!!errores.email" />
          <small v-if="errores.email">{{ errores.email }}</small>
        </label>

        <h2 class="sm:col-span-2 mt-2 font-semibold text-slate-700">Datos académicos</h2>
        <label class="campo">
          Matrícula
          <InputText v-model="form.matricula" :invalid="!!errores.matricula" />
          <small v-if="errores.matricula">{{ errores.matricula }}</small>
        </label>
        <label class="campo">
          Carrera
          <Select
            v-model="form.idCarrera"
            :options="carreras"
            :option-label="(c) => `${c.nombreCarrera} (${c.nombreTipoPeriodo.toLowerCase()})`"
            option-value="idCarrera"
            placeholder="Elige tu carrera"
            :invalid="!!errores.idCarrera"
            @change="form.numeroPeriodo = null"
          />
          <small v-if="errores.idCarrera">{{ errores.idCarrera }}</small>
        </label>
        <label class="campo">
          {{ carrera ? `${carrera.nombreTipoPeriodo} que cursas` : 'Periodo que cursas' }}
          <Select
            v-model="form.numeroPeriodo"
            :options="periodos"
            option-label="label"
            option-value="value"
            :placeholder="carrera ? `${carrera.nombreTipoPeriodo}` : 'Primero elige carrera'"
            :disabled="!carrera"
            :invalid="!!errores.numeroPeriodo"
          />
          <small v-if="errores.numeroPeriodo">{{ errores.numeroPeriodo }}</small>
        </label>
        <label class="campo">
          Grupo
          <InputText v-model="form.grupo" placeholder="Ej. 7A" :invalid="!!errores.grupo" />
          <small v-if="errores.grupo">{{ errores.grupo }}</small>
        </label>

        <h2 class="sm:col-span-2 mt-2 font-semibold text-slate-700">Contraseña</h2>
        <label class="campo">
          Contraseña
          <Password v-model="form.password" :feedback="false" toggle-mask fluid :invalid="!!errores.password" />
          <small v-if="errores.password">{{ errores.password }}</small>
        </label>
        <label class="campo">
          Confirmar contraseña
          <Password v-model="form.confirmar" :feedback="false" toggle-mask fluid :invalid="!!errores.confirmar" />
          <small v-if="errores.confirmar">{{ errores.confirmar }}</small>
        </label>

        <div class="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
          <RouterLink to="/login" class="text-sm font-medium text-[#0b3a63] hover:underline">
            Ya tengo cuenta, iniciar sesión
          </RouterLink>
          <Button type="submit" label="Crear cuenta" icon="pi pi-user-plus" :loading="enviando" />
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.campo {
  @apply flex flex-col gap-1.5 text-sm font-medium text-slate-700;
}
.campo small {
  @apply font-normal text-red-600;
}
</style>
