// Estados tal como los aceptan los CHECK de las migraciones (006).

export const ESTADOS_CARTA = Object.freeze({
  GENERADA: 'GENERADA',
  ESCANEO_SUBIDO: 'ESCANEO_SUBIDO',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
});

export const ESTADOS_VACANTE = Object.freeze({
  ABIERTA: 'ABIERTA',
  CERRADA: 'CERRADA',
  CANCELADA: 'CANCELADA',
});

export const MODALIDADES_TRABAJO = Object.freeze({
  PRESENCIAL: 'PRESENCIAL',
  REMOTO: 'REMOTO',
  MIXTO: 'MIXTO',
});

export const ESTADOS_POSTULACION = Object.freeze({
  POSTULADA: 'POSTULADA',
  NO_SELECCIONADA: 'NO_SELECCIONADA',
  RETIRADA: 'RETIRADA',
  ACEPTADA: 'ACEPTADA',
  CERRADA_POR_CONFIRMACION: 'CERRADA_POR_CONFIRMACION',
});

export const ESTADOS_ACEPTACION = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  CONFIRMADA: 'CONFIRMADA',
  RECHAZADA_ALUMNO: 'RECHAZADA_ALUMNO',
  CANCELADA_OFERTADOR: 'CANCELADA_OFERTADOR',
  EXPIRADA: 'EXPIRADA',
  CERRADA_POR_CONFIRMACION: 'CERRADA_POR_CONFIRMACION',
});

export const ESTADOS_PRACTICA = Object.freeze({
  ACTIVA: 'ACTIVA',
  EN_REVISION_CIERRE: 'EN_REVISION_CIERRE',
  CERRADA: 'CERRADA',
  BAJA: 'BAJA',
});

export const ESTADOS_TAREA = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  ENTREGADA: 'ENTREGADA',
  COMPLETADA: 'COMPLETADA',
});

export const ESTADOS_INCIDENCIA = Object.freeze({
  ABIERTA: 'ABIERTA',
  RESUELTA: 'RESUELTA',
});

export const ESTADOS_BAJA = Object.freeze({
  EN_REVISION_ACADEMICA: 'EN_REVISION_ACADEMICA',
  RESUELTA_SIN_BAJA: 'RESUELTA_SIN_BAJA',
  ESCALADA: 'ESCALADA',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
});

export const TIPOS_OFERTADOR = Object.freeze({
  EXTERNO: 'EXTERNO',
  INTERNO: 'INTERNO',
});

// Texto legible para la UI
export const ETIQUETA_ESTADO = Object.freeze({
  GENERADA: 'Generada',
  ESCANEO_SUBIDO: 'Escaneo subido',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
  POSTULADA: 'Postulada',
  NO_SELECCIONADA: 'No seleccionada',
  RETIRADA: 'Retirada',
  ACEPTADA: 'Aceptada',
  CERRADA_POR_CONFIRMACION: 'Cerrada (confirmó otra)',
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  RECHAZADA_ALUMNO: 'Rechazada por el alumno',
  CANCELADA_OFERTADOR: 'Cancelada por el ofertador',
  EXPIRADA: 'Expirada',
  ACTIVA: 'Activa',
  EN_REVISION_CIERRE: 'En revisión de cierre',
  BAJA: 'Baja',
  ENTREGADA: 'Entregada',
  COMPLETADA: 'Completada',
  RESUELTA: 'Resuelta',
  EN_REVISION_ACADEMICA: 'En revisión académica',
  RESUELTA_SIN_BAJA: 'Resuelta sin baja',
  ESCALADA: 'Escalada',
  PRESENCIAL: 'Presencial',
  REMOTO: 'Remoto',
  MIXTO: 'Mixto',
  EXTERNO: 'Externo',
  INTERNO: 'Interno',
});
