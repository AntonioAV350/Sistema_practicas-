<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Encabezado from '../../components/Encabezado.vue';
import EstadoTag from '../../components/EstadoTag.vue';
import * as api from '../../services/vacantes';
import { useAviso } from '../../composables/useAviso';
import { fecha, fechaHora, nombreCompleto, tiempoRestante, estado as etiqueta } from '../../utils/formato';

// Postulantes de una vacante: aceptar (da 48 h al alumno), descartar o cancelar una aceptación.
// También la usa administración (solo lectura).
const route = useRoute();
const router = useRouter();
const { exito, error, confirmar } = useAviso();
const datos = ref(null);
const trabajando = ref(null);
const esOfertador = route.path.startsWith('/ofertador');

async function cargar() {
  try {
    datos.value = await api.postulantes(route.params.id);
  } catch (e) {
    error(e);
  }
}

async function accion(p, tipo) {
  const nombre = nombreCompleto(p);
  const textos = {
    aceptar: {
      titulo: 'Aceptar alumno',
      mensaje: `${nombre} tendrá 48 horas para confirmar. Si confirma, ocupará un lugar de la vacante.`,
      aceptar: 'Aceptar',
    },
    descartar: { titulo: 'No seleccionar', mensaje: `Se avisará a ${nombre} que no fue seleccionado.`, aceptar: 'No seleccionar', peligro: true },
    cancelar: { titulo: 'Cancelar aceptación', mensaje: `Se cancelará la aceptación de ${nombre}.`, aceptar: 'Cancelar aceptación', peligro: true },
  }[tipo];
  if (!(await confirmar(textos))) return;
  trabajando.value = p.idPostulacion;
  try {
    if (tipo === 'aceptar') await api.aceptar(p.idPostulacion);
    if (tipo === 'descartar') await api.descartar(p.idPostulacion);
    if (tipo === 'cancelar') await api.cancelar(p.idAceptacion);
    exito('Listo. Se notificó al alumno.');
    cargar();
  } catch (e) {
    error(e);
  } finally {
    trabajando.value = null;
  }
}

onMounted(cargar);
</script>

<template>
  <template v-if="datos">
    <Encabezado :titulo="datos.vacante.titulo" :descripcion="`${datos.vacante.tipoPractica} · ${datos.vacante.cupoDisponible} de ${datos.vacante.cupoTotal} lugares libres`">
      <EstadoTag :estado="datos.vacante.estado" />
      <Button label="Volver" icon="pi pi-arrow-left" text @click="router.back()" />
    </Encabezado>

    <div class="tarjeta mb-6 text-sm text-slate-700 whitespace-pre-line">{{ datos.vacante.descripcion }}</div>

    <div class="tarjeta">
      <h3 class="font-semibold mb-3">Postulantes ({{ datos.postulantes.length }})</h3>
      <DataTable :value="datos.postulantes" data-key="idPostulacion" size="small" striped-rows>
        <template #empty>Todavía no hay postulantes.</template>
        <Column header="Alumno">
          <template #body="{ data }">
            <div class="font-medium">{{ nombreCompleto(data) }}</div>
            <div class="text-xs text-slate-500">{{ data.email }}{{ data.telefono ? ` · ${data.telefono}` : '' }}</div>
          </template>
        </Column>
        <Column header="Carrera">
          <template #body="{ data }">
            {{ data.nombreCarrera }}
            <div class="text-xs text-slate-500">
              {{ data.matricula }} · {{ data.numeroPeriodo ? `${data.numeroPeriodo}° ${data.tipoPeriodo}` : '' }} {{ data.grupo }}
            </div>
          </template>
        </Column>
        <Column header="Postulado">
          <template #body="{ data }">{{ fecha(data.postuladaEn) }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <EstadoTag :estado="data.estadoAceptacion || data.estado" />
              <span v-if="data.estadoAceptacion === 'PENDIENTE'" class="text-xs text-slate-500">
                vence en {{ tiempoRestante(data.expiraEn) }} ({{ fechaHora(data.expiraEn) }})
              </span>
              <Tag v-if="data.idCartaAprobada" value="Carta aprobada" severity="success" class="!text-xs" />
            </div>
          </template>
        </Column>
        <Column v-if="esOfertador" header="" class="text-right whitespace-nowrap">
          <template #body="{ data }">
            <template v-if="data.estado === 'POSTULADA'">
              <Button label="No seleccionar" size="small" text severity="danger" :loading="trabajando === data.idPostulacion" @click="accion(data, 'descartar')" />
              <Button
                label="Aceptar"
                size="small"
                icon="pi pi-check"
                :disabled="datos.vacante.estado !== 'ABIERTA' || datos.vacante.cupoDisponible <= 0"
                :loading="trabajando === data.idPostulacion"
                @click="accion(data, 'aceptar')"
              />
            </template>
            <Button
              v-else-if="data.estadoAceptacion === 'PENDIENTE'"
              label="Cancelar aceptación"
              size="small"
              text
              severity="danger"
              :loading="trabajando === data.idPostulacion"
              @click="accion(data, 'cancelar')"
            />
            <Button
              v-else-if="data.idPractica"
              label="Ver práctica"
              size="small"
              text
              @click="router.push(`/ofertador/practicantes/${data.idPractica}`)"
            />
          </template>
        </Column>
      </DataTable>
      <p class="mt-3 text-xs text-slate-500">
        Estados: {{ ['POSTULADA', 'PENDIENTE', 'CONFIRMADA', 'EXPIRADA'].map(etiqueta).join(' → ') }}. Una postulación
        solo se puede aceptar una vez.
      </p>
    </div>
  </template>
</template>
