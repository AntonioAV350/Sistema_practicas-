const pool = require('../../config/db');
const { withTransaction } = pool;
const repository = require('./repository');
const alumnos = require('../alumnos/service');
const ofertadores = require('../ofertadores/service');
const { notificarUsuario } = require('../../utils/notificar');
const { forbidden, notFound, conflict, badRequest } = require('../../utils/AppError');
const { esAdmin } = require('../../utils/sesion');
const { ESTADOS_VACANTE, ESTADOS_POSTULACION, ESTADOS_ACEPTACION } = require('shared/constants');

// SIGEA-29/30: vacantes, postulaciones y aceptaciones (48 h).
// La BD valida carta aprobada, práctica viva, cupo y vencimiento (triggers y
// sp_confirmar_aceptacion); aquí se valida la propiedad de cada recurso y
// se mantienen sincronizados los estados de las postulaciones.

// ---------- helpers ----------

async function vacanteDelOfertador(idVacante, idUsuario) {
  const vacante = await repository.obtener(idVacante);
  if (!vacante) throw notFound('Vacante no encontrada');
  if (vacante.id_usuario_ofertador !== idUsuario) throw forbidden('Esta vacante no es tuya');
  return vacante;
}

function validarCierre(cierraEn) {
  if (cierraEn && new Date(cierraEn) <= new Date()) throw badRequest('La fecha de cierre debe ser futura');
}

// Requisito académico que la BD no valida: periodo mínimo de la carrera en el ciclo vigente
function validarPeriodo(perfil) {
  if (!perfil.numero_periodo) {
    throw conflict('Registra en "Mis datos" el periodo que cursas en el ciclo actual');
  }
  if (perfil.numero_periodo < perfil.periodo_minimo_practicas) {
    throw conflict(`Puedes postularte a partir del periodo ${perfil.periodo_minimo_practicas} de tu carrera`);
  }
}

// ---------- vacantes ----------

async function crear(idUsuario, datos) {
  const ofertador = await ofertadores.perfilDeUsuario(idUsuario);
  if (!(await repository.tipoPracticaExiste(datos.idTipoPractica))) throw badRequest('El tipo de práctica no existe');
  validarCierre(datos.cierraEn);
  const id = await repository.crear(ofertador.id_ofertador, datos);
  return repository.obtener(id);
}

async function actualizar(idUsuario, idVacante, datos) {
  const vacante = await vacanteDelOfertador(idVacante, idUsuario);
  if (vacante.estado === ESTADOS_VACANTE.CANCELADA) throw conflict('Una vacante cancelada ya no se puede editar');
  if (datos.idTipoPractica && !(await repository.tipoPracticaExiste(datos.idTipoPractica))) {
    throw badRequest('El tipo de práctica no existe');
  }
  if (datos.cierraEn !== undefined) validarCierre(datos.cierraEn);
  const ocupados = vacante.cupo_total - vacante.cupo_disponible;
  if (datos.cupoTotal !== undefined && datos.cupoTotal < ocupados) {
    throw conflict(`Ya hay ${ocupados} lugar(es) ocupado(s); el cupo no puede ser menor`);
  }
  await repository.actualizar(idVacante, datos);
  return repository.obtener(idVacante);
}

async function cambiarEstado(idUsuario, idVacante, estado) {
  const vacante = await vacanteDelOfertador(idVacante, idUsuario);
  if (vacante.estado === estado) return vacante;
  if (vacante.estado === ESTADOS_VACANTE.CANCELADA) throw conflict('La vacante ya está cancelada');
  if (estado === ESTADOS_VACANTE.ABIERTA && vacante.cupo_disponible <= 0) {
    throw conflict('La vacante no tiene cupo disponible; aumenta el cupo antes de reabrirla');
  }

  return withTransaction(async (db) => {
    await repository.cambiarEstado(idVacante, estado, db);
    if (estado === ESTADOS_VACANTE.CANCELADA) {
      const afectados = await repository.cerrarPorCancelacion(idVacante, db);
      for (const idUsuarioAlumno of new Set(afectados)) {
        await notificarUsuario(db, {
          idUsuario: idUsuarioAlumno,
          tipo: 'VACANTE_CANCELADA',
          titulo: `La vacante "${vacante.titulo}" fue cancelada`,
          mensaje: 'Tu postulación quedó cerrada. Puedes postularte a otras vacantes.',
          entidad: 'aceptacion',
        });
      }
    }
    return repository.obtener(idVacante, db);
  });
}

async function detalle(idVacante, user) {
  const vacante = await repository.obtener(idVacante);
  if (!vacante) throw notFound('Vacante no encontrada');
  return vacante; // la información de una vacante no es confidencial para usuarios con sesión
}

async function misVacantes(idUsuario) {
  const ofertador = await ofertadores.perfilDeUsuario(idUsuario);
  return repository.listarDeOfertador(ofertador.id_ofertador);
}

async function abiertas(idUsuario, filtros) {
  const perfil = await alumnos.perfilDeUsuario(idUsuario);
  return repository.listarAbiertas(perfil.id_alumno, filtros);
}

const todas = (filtros) => repository.listarTodas(filtros);

// Lo que la UI necesita para explicar por qué el alumno no puede postularse
async function elegibilidad(idUsuario) {
  const perfil = await alumnos.perfilDeUsuario(idUsuario);
  const r = await repository.puedePostular(perfil.id_alumno);
  let motivo = null;
  if (r.practica_viva) motivo = 'Ya tienes una práctica en curso.';
  else if (!r.carta_aprobada) motivo = 'Necesitas tu carta de presentación aprobada para postularte.';
  else if (!perfil.numero_periodo) motivo = 'Registra en "Mis datos" el periodo que cursas en el ciclo actual.';
  else if (perfil.numero_periodo < perfil.periodo_minimo_practicas) {
    motivo = `Puedes postularte a partir del periodo ${perfil.periodo_minimo_practicas}.`;
  }
  return { puede: !motivo, motivo, cartaAprobada: r.carta_aprobada, practicaViva: r.practica_viva };
}

// ---------- postulaciones ----------

async function postular(idUsuario, idVacante) {
  const perfil = await alumnos.perfilDeUsuario(idUsuario);
  validarPeriodo(perfil);
  const vacante = await repository.obtener(idVacante);
  if (!vacante) throw notFound('Vacante no encontrada');

  let idPostulacion;
  try {
    idPostulacion = await repository.crearPostulacion(idVacante, perfil.id_alumno);
  } catch (err) {
    if (err.code === '23505') throw conflict('Ya te postulaste a esta vacante', 'YA_POSTULADO');
    throw err;
  }
  await notificarUsuario(pool, {
    idUsuario: vacante.id_usuario_ofertador,
    tipo: 'POSTULACION_NUEVA',
    titulo: `Nueva postulación en "${vacante.titulo}"`,
    mensaje: `${perfil.nombre} ${perfil.apellido_paterno} (${perfil.nombre_carrera}) se postuló.`,
    entidad: 'vacante',
    idEntidad: idVacante,
  });
  return repository.obtenerPostulacion(idPostulacion);
}

async function misPostulaciones(idUsuario) {
  const perfil = await alumnos.perfilDeUsuario(idUsuario);
  return repository.postulacionesDeAlumno(perfil.id_alumno);
}

async function retirar(idUsuario, idPostulacion) {
  const p = await repository.obtenerPostulacion(idPostulacion);
  if (!p) throw notFound('Postulación no encontrada');
  if (p.id_usuario_alumno !== idUsuario) throw forbidden('Esta postulación no es tuya');
  if (p.estado !== ESTADOS_POSTULACION.POSTULADA) {
    throw conflict('Solo puedes retirar postulaciones que aún no han sido atendidas');
  }
  await repository.cambiarEstadoPostulacion(idPostulacion, ESTADOS_POSTULACION.RETIRADA);
  return repository.obtenerPostulacion(idPostulacion);
}

async function postulantes(idVacante, user) {
  const vacante = await repository.obtener(idVacante);
  if (!vacante) throw notFound('Vacante no encontrada');
  if (vacante.id_usuario_ofertador !== user.id && !esAdmin(user)) throw forbidden('Esta vacante no es tuya');
  return { vacante, postulantes: await repository.postulantesDeVacante(idVacante) };
}

async function postulacionDelOfertador(idPostulacion, idUsuario, db) {
  const p = await repository.obtenerPostulacion(idPostulacion, db);
  if (!p) throw notFound('Postulación no encontrada');
  if (p.id_usuario_ofertador !== idUsuario) throw forbidden('Esta postulación no es de tus vacantes');
  return p;
}

// El ofertador acepta: nace una aceptación PENDIENTE con 48 h para que el alumno confirme
async function aceptar(idUsuario, idPostulacion) {
  return withTransaction(async (db) => {
    const p = await postulacionDelOfertador(idPostulacion, idUsuario, db);
    if (p.estado !== ESTADOS_POSTULACION.POSTULADA) throw conflict('Esta postulación ya fue atendida');
    if (p.cupo_disponible <= 0) throw conflict('La vacante ya no tiene cupo disponible');
    // primero la aceptación (el trigger exige que la postulación siga POSTULADA)
    await repository.crearAceptacion(idPostulacion, idUsuario, db);
    await repository.cambiarEstadoPostulacion(idPostulacion, ESTADOS_POSTULACION.ACEPTADA, db);
    return repository.obtenerPostulacion(idPostulacion, db);
  });
}

async function descartar(idUsuario, idPostulacion) {
  return withTransaction(async (db) => {
    const p = await postulacionDelOfertador(idPostulacion, idUsuario, db);
    if (p.estado !== ESTADOS_POSTULACION.POSTULADA) throw conflict('Esta postulación ya fue atendida');
    await repository.cambiarEstadoPostulacion(idPostulacion, ESTADOS_POSTULACION.NO_SELECCIONADA, db);
    await notificarUsuario(db, {
      idUsuario: p.id_usuario_alumno,
      tipo: 'POSTULACION_NO_SELECCIONADA',
      titulo: `No fuiste seleccionado en "${p.titulo}"`,
      mensaje: 'Puedes seguir postulándote a otras vacantes.',
      entidad: 'aceptacion',
      idEntidad: idPostulacion,
    });
    return repository.obtenerPostulacion(idPostulacion, db);
  });
}

// ---------- aceptaciones ----------

async function aceptacionPendiente(idAceptacion, db) {
  const p = await repository.obtenerPorAceptacion(idAceptacion, db);
  if (!p) throw notFound('Aceptación no encontrada');
  if (p.estado_aceptacion !== ESTADOS_ACEPTACION.PENDIENTE) throw conflict('Esta aceptación ya no está pendiente');
  return p;
}

async function confirmar(idUsuario, idAceptacion) {
  return withTransaction(async (db) => {
    const p = await aceptacionPendiente(idAceptacion, db);
    if (p.id_usuario_alumno !== idUsuario) throw forbidden('Esta aceptación no es tuya');
    if (p.estado_vacante === ESTADOS_VACANTE.CANCELADA) throw conflict('La vacante fue cancelada');
    const idPractica = await repository.confirmarAceptacion(idAceptacion, idUsuario, db);
    await repository.cerrarOtrasPostulaciones(p.id_alumno, p.id_postulacion, db);
    return { idPractica };
  });
}

async function rechazar(idUsuario, idAceptacion) {
  return withTransaction(async (db) => {
    const p = await aceptacionPendiente(idAceptacion, db);
    if (p.id_usuario_alumno !== idUsuario) throw forbidden('Esta aceptación no es tuya');
    await repository.cambiarEstadoAceptacion(idAceptacion, ESTADOS_ACEPTACION.RECHAZADA_ALUMNO, db);
    await repository.cambiarEstadoPostulacion(p.id_postulacion, ESTADOS_POSTULACION.RETIRADA, db);
    await notificarUsuario(db, {
      idUsuario: p.id_usuario_ofertador,
      tipo: 'ACEPTACION_RECHAZADA',
      titulo: `Un alumno rechazó tu aceptación en "${p.titulo}"`,
      entidad: 'vacante',
      idEntidad: p.id_vacante,
    });
    return repository.obtenerPostulacion(p.id_postulacion, db);
  });
}

async function cancelar(idUsuario, idAceptacion) {
  return withTransaction(async (db) => {
    const p = await aceptacionPendiente(idAceptacion, db);
    if (p.id_usuario_ofertador !== idUsuario) throw forbidden('Esta aceptación no es de tus vacantes');
    await repository.cambiarEstadoAceptacion(idAceptacion, ESTADOS_ACEPTACION.CANCELADA_OFERTADOR, db);
    await repository.cambiarEstadoPostulacion(p.id_postulacion, ESTADOS_POSTULACION.NO_SELECCIONADA, db);
    await notificarUsuario(db, {
      idUsuario: p.id_usuario_alumno,
      tipo: 'ACEPTACION_CANCELADA',
      titulo: `El ofertador canceló tu aceptación en "${p.titulo}"`,
      mensaje: 'Puedes seguir postulándote a otras vacantes.',
      entidad: 'aceptacion',
      idEntidad: idAceptacion,
    });
    return repository.obtenerPostulacion(p.id_postulacion, db);
  });
}

module.exports = {
  crear, actualizar, cambiarEstado, detalle, misVacantes, abiertas, todas, elegibilidad,
  postular, misPostulaciones, retirar, postulantes, aceptar, descartar, confirmar, rechazar, cancelar,
};
