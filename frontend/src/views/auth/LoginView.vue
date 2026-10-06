<script setup>
import { reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useAuthStore } from '../../stores/auth';
import { mensajeErrorLogin, MSG_SESION_EXPIRADA } from '../../utils/authErrors';

const auth = useAuthStore();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const errors = reactive({ email: '', password: '' });
const touched = ref(false);
const loading = ref(false);
const serverError = ref(route.query.expirada ? MSG_SESION_EXPIRADA : null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail() {
  const v = form.email.trim();
  if (!v) errors.email = 'Escribe tu correo institucional.';
  else if (!EMAIL_RE.test(v)) errors.email = 'El correo no tiene un formato válido (ej. nombre@unach.mx).';
  else errors.email = '';
}

function validatePassword() {
  errors.password = form.password ? '' : 'Escribe tu contraseña.';
}

watch(
  () => [form.email, form.password],
  () => {
    serverError.value = null;
  },
);

async function onSubmit() {
  touched.value = true;
  validateEmail();
  validatePassword();
  if (errors.email || errors.password || loading.value) return;

  loading.value = true;
  serverError.value = null;
  try {
    await auth.login(form.email.trim(), form.password);
  } catch (e) {
    serverError.value = mensajeErrorLogin(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen grid lg:grid-cols-[minmax(380px,460px)_1fr] bg-slate-50">
    <section class="flex flex-col justify-center px-8 sm:px-12 py-8 bg-white">
      <div class="w-full max-w-sm mx-auto">
        <!-- Logo UNACH -->
        <header class="mb-6 h-72 flex flex-col justify-end">
          <div class="flex flex-col items-center gap-3">
            <img
              src="/escudo_u.png"
              alt="Escudo de la UNACH"
              class="h-56 w-56 object-contain"
            />
            <div class="flex w-full items-center gap-4">
              <div class="h-px flex-1 bg-slate-300"></div>
              <span class="text-lg font-bold tracking-widest text-[#0b3a63]">SIGEAA</span>
              <div class="h-px flex-1 bg-slate-300"></div>
            </div>
          </div>
        </header>

        <!-- Mensaje de error -->
        <Message v-if="serverError" severity="error" :closable="false" class="mb-5" role="alert">
          {{ serverError }}
        </Message>

        <!-- Formulario -->
        <form novalidate class="space-y-5" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-slate-700">Correo institucional</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              placeholder="nombre.apellido@unach.mx"
              :invalid="!!errors.email"
              :disabled="loading"
              class="w-full"
              aria-describedby="email-error"
              @blur="touched && validateEmail()"
              @input="touched && validateEmail()"
            />
            <small v-if="errors.email" id="email-error" class="text-sm text-red-600">{{ errors.email }}</small>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-sm font-medium text-slate-700">Contraseña</label>
            <Password
              v-model="form.password"
              input-id="password"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              placeholder="Tu contraseña"
              :invalid="!!errors.password"
              :disabled="loading"
              fluid
              @blur="touched && validatePassword()"
              @input="touched && validatePassword()"
            />
            <small v-if="errors.password" id="password-error" class="text-sm text-red-600">{{ errors.password }}</small>
          </div>

          <div class="text-right -mt-2">
            <RouterLink to="/recuperar" class="text-sm font-medium text-[#0b3a63] hover:underline">
              ¿Olvidaste tu contraseña?
            </RouterLink>
          </div>

          <Button
            type="submit"
            label="Entrar"
            :loading="loading"
            :disabled="loading"
            class="w-full !bg-[#0b3a63] !border-[#0b3a63]"
          />
        </form>

        <!-- Registro -->
        <div class="mt-6 pt-5 border-t border-slate-200 text-sm text-slate-600 flex flex-col gap-1">
          <span>¿No tienes una cuenta?</span>
          <RouterLink to="/registro" class="font-semibold text-[#0b3a63] hover:underline">
            Regístrate
          </RouterLink>
        </div>

        <!-- Pie de página -->
        <footer class="mt-6 text-xs text-slate-400">
          © 2026 Universidad Autónoma de Chiapas
        </footer>
      </div>
    </section>

    <!-- Panel derecho -->
    <aside class="hidden lg:flex relative overflow-hidden bg-[#0b3a63] text-white items-end p-14">
      <!-- Imagen de fondo -->
      <img
        src="/login-bg.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      />

      <!-- Capa oscura -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#0b3a63]/90 via-[#0b3a63]/40 to-transparent"
        aria-hidden="true"
      />

      <!-- Logo ocelote -->
      <img
        src="/ocelote_h.png"
        alt="Ocelote UNACH"
        class="absolute top-8 right-8 h-32 w-32 drop-shadow-lg"
      />

      <!-- Cuerpo -->
      <div class="relative max-w-md">
        <h2 class="text-3xl font-semibold leading-snug">
          Gestiona tus prácticas profesionales y residencias en un solo lugar.
        </h2>
        <p class="mt-3 text-sm text-blue-100">
          Postula, da seguimiento y consulta el estado de tu proceso.
        </p>
      </div>
    </aside>
  </main>
</template>
