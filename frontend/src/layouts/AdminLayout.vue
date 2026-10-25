<script setup>
import AppLayout from './AppLayout.vue';
import { MENU_ADMIN } from '../router/menus';
</script>

<template>
  <AppLayout :menu="MENU_ADMIN" panel="Panel de administración" ruta-notificaciones="/admin/notificaciones" />
</template>
