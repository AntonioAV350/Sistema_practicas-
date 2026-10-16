<script setup>
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="tarjeta">
    <h2 class="text-xl font-semibold">Hola, {{ auth.usuario?.nombre }}</h2>
    <p class="mt-1 text-slate-500">Usa el menú de la izquierda para empezar.</p>
  </div>
</template>
