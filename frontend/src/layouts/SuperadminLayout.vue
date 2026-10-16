<script setup>
import AppLayout from './AppLayout.vue';
import { MENU_SUPERADMIN } from '../router/menus';
</script>

<template>
  <AppLayout :menu="MENU_SUPERADMIN" panel="Superadministración" ruta-notificaciones="/superadmin/notificaciones" />
</template>
