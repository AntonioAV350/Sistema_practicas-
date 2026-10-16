<script setup>
import AppLayout from './AppLayout.vue';
import { MENU_OFERTADOR } from '../router/menus';
</script>

<template>
  <AppLayout :menu="MENU_OFERTADOR" panel="Panel del ofertador" ruta-notificaciones="/ofertador/notificaciones" />
</template>
