<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import Encabezado from '../../components/Encabezado.vue';
import PracticaSeguimiento from '../../components/PracticaSeguimiento.vue';
import * as api from '../../services/practicas';
import { useAviso } from '../../composables/useAviso';
import { nombreCompleto } from '../../utils/formato';

// Detalle de una práctica para el ofertador y para administración
const route = useRoute();
const { error } = useAviso();
const practica = ref(null);
const rol = route.path.startsWith('/ofertador') ? 'OFERTADOR' : 'ADMIN';

async function cargar() {
  try {
    practica.value = await api.detalle(route.params.id);
  } catch (e) {
    error(e);
  }
}

watch(() => route.params.id, (id) => id && cargar());
onMounted(cargar);
</script>

<template>
  <template v-if="practica">
    <Encabezado :titulo="nombreCompleto(practica)" :descripcion="`${practica.titulo} · ${practica.empresa}`">
      <Button label="Volver" icon="pi pi-arrow-left" text @click="$router.back()" />
    </Encabezado>
    <PracticaSeguimiento :practica="practica" :rol="rol" @recargar="cargar" />
  </template>
</template>
