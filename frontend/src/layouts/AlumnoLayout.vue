<script setup>
import AppLayout from './AppLayout.vue';
import { MENU_ALUMNO } from '../router/menus';
</script>

<template>
  <AppLayout :menu="MENU_ALUMNO" panel="Panel del alumno" ruta-notificaciones="/alumno/notificaciones" />
</template>
