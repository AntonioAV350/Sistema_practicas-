<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const auth = useAuthStore();
const titulo = computed(() => route.meta.titulo ?? 'Bienvenido');
</script>

<template>
  <main class="min-h-screen grid place-items-center bg-slate-50 p-6">
    <div class="w-full max-w-md rounded-xl bg-white p-8 border border-slate-200 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">{{ titulo }}</h1>
      <p v-if="auth.usuario" class="mt-3 text-sm text-slate-600">
        {{ auth.nombreCompleto }} · rol: <strong>{{ auth.roles.join(', ') }}</strong>
      </p>
      <p class="mt-1 text-sm text-slate-500">Tu vista todavía no está disponible.</p>
      <Button label="Cerrar sesión" severity="secondary" class="mt-6" @click="auth.logout()" />
    </div>
  </main>
</template>
