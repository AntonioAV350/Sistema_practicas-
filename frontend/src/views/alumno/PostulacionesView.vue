<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/vacantes';
import { useAviso } from '../../composables/useAviso';
import { fecha, fechaHora, tiempoRestante } from '../../utils/formato';

// Postulaciones del alumno y aceptaciones por confirmar (48 h).
// Al confirmar una, las demás se cierran solas y nace la práctica.
const router = useRouter();
const { exito, error, confirmar } = useAviso();
const lista = ref([]);
const cargando = ref(true);
const trabajando = ref(null);
const ahora = ref(Date.now());
let reloj;

const pendientes = computed(() =>
  lista.value.filter((p) => p.estadoAceptacion === 'PENDIENTE' && new Date(p.expiraEn) > ahora.value),
);

async function cargar() {
  try {
    lista.value = await api.misPostulaciones();
  } catch (e) {
    error(e);
  } finally {
    cargando.value = false;
  }
}

async function accion(p, tipo) {
  const textos = {
    confirmar: {
      titulo: 'Confirmar práctica',
      mensaje: `¿Confirmas tu práctica en "${p.titulo}" (${p.empresa})? Tus demás postulaciones y aceptaciones se cerrarán.`,
      aceptar: 'Confirmar',
    },
    rechazar: { titulo: 'Rechazar aceptación', mensaje: `¿Rechazas la aceptación de "${p.titulo}"?`, aceptar: 'Rechazar', peligro: true },
    retirar: { titulo: 'Retirar postulación', mensaje: `¿Retiras tu postulación a "${p.titulo}"?`, aceptar: 'Retirar', peligro: true },
  }[tipo];
  if (!(await confirmar(textos))) return;

  trabajando.value = p.idPostulacion;
  try {
    if (tipo === 'confirmar') {
      await api.confirmar(p.idAceptacion);
      exito('¡Tu práctica quedó confirmada!');
      return router.push('/alumno/practica');
    }
    if (tipo === 'rechazar') await api.rechazar(p.idAceptacion);
    if (tipo === 'retirar') await api.retirar(p.idPostulacion);
    exito('Listo.');
    await cargar();
  } catch (e) {
    error(e);
    cargar();
  } finally {
    trabajando.value = null;
  }
}

onMounted(() => {
  cargar();
  reloj = setInterval(() => (ahora.value = Date.now()), 30_000);
});
onBeforeUnmount(() => clearInterval(reloj));
</script>

<template>
  <Encabezado titulo="Mis postulaciones" descripcion="Cuando un ofertador te acepte tendrás 48 horas para confirmar.">
    <Button label="Buscar vacantes" icon="pi pi-briefcase" outlined @click="router.push('/alumno/vacantes')" />
  </Encabezado>

  <section v-if="pendientes.length" class="mb-6 space-y-3">
    <h3 class="font-semibold text-slate-800">Aceptaciones por confirmar</h3>
    <div
      v-for="p in pendientes"
      :key="p.idAceptacion"
      class="tarjeta !border-amber-300 !bg-amber-50 flex flex-wrap items-center justify-between gap-4"
    >
      <div>
        <div class="font-semibold">{{ p.titulo }}</div>
        <div class="text-sm text-slate-600">{{ p.empresa }} · {{ p.tipoPractica }}</div>
        <div class="text-sm mt-1">
          <i class="pi pi-clock text-amber-600" /> Te quedan <strong>{{ tiempoRestante(p.expiraEn) }}</strong>
          <span class="text-slate-500">(vence {{ fechaHora(p.expiraEn) }})</span>
        </div>
      </div>
      <div class="flex gap-2">
        <Button label="Rechazar" severity="danger" outlined :loading="trabajando === p.idPostulacion" @click="accion(p, 'rechazar')" />
        <Button label="Confirmar práctica" icon="pi pi-check" severity="success" :loading="trabajando === p.idPostulacion" @click="accion(p, 'confirmar')" />
      </div>
    </div>
  </section>

  <Message v-if="lista.some((p) => p.idPractica)" severity="success" :closable="false" class="mb-5">
    Ya tienes una práctica confirmada.
    <RouterLink to="/alumno/practica" class="font-semibold underline">Ver mi práctica</RouterLink>
  </Message>

  <div class="tarjeta">
    <DataTable :value="lista" :loading="cargando" data-key="idPostulacion" size="small" striped-rows>
      <template #empty>Aún no te has postulado a ninguna vacante.</template>
      <Column header="Vacante">
        <template #body="{ data }">
          <div class="font-medium">{{ data.titulo }}</div>
          <div class="text-xs text-slate-500">{{ data.empresa }}</div>
        </template>
      </Column>
      <Column header="Postulada">
        <template #body="{ data }">{{ fecha(data.postuladaEn) }}</template>
      </Column>
      <Column header="Postulación">
        <template #body="{ data }"><EstadoTag :estado="data.estado" /></template>
      </Column>
      <Column header="Aceptación">
        <template #body="{ data }"><EstadoTag :estado="data.estadoAceptacion" /></template>
      </Column>
      <Column header="" class="text-right">
        <template #body="{ data }">
          <Button
            v-if="data.estado === 'POSTULADA'"
            label="Retirar"
            size="small"
            text
            severity="danger"
            :loading="trabajando === data.idPostulacion"
            @click="accion(data, 'retirar')"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
