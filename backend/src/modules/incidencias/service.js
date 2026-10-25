const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const practicas = require('../practicas/service');
const { notificarUsuario } = require('../../utils/notificar');
const { forbidden, notFound, conflict } = require('../../utils/AppError');
const { esAdmin, tieneSubrol } = require('../../utils/sesion');

// SIGEA-33: el ofertador registra incidencias de su practicante; el
// Administrador Académico las atiende. El trigger valida que quien reporta
// sea el ofertador de la práctica y que la práctica siga en curso.

async function registrar(datos, user) {
  const p = await practicas.practicaConAcceso(datos.idPractica, user);
  if (p.rolUsuario !== 'OFERTADOR') throw forbidden('Solo el ofertador de la práctica registra incidencias');
  if (datos.fechaHecho < p.fecha_inicio) throw conflict('La fecha del hecho es anterior al inicio de la práctica');
  const id = await repository.crear(datos.idPractica, user.id, datos);
  return repository.obtener(id);
}

function listar(filtros, user) {
  if (esAdmin(user)) return repository.listar(filtros);
  return repository.listar({ ...filtros, idUsuarioOfertador: user.id });
}

async function resolver(idIncidencia, resolucion, user) {
  if (!tieneSubrol(user, 'ADMIN_ACADEMICO')) throw forbidden('Las incidencias las atiende el Administrador Académico');
  return withTransaction(async (db) => {
    const i = await repository.obtener(idIncidencia, db);
    if (!i) throw notFound('Incidencia no encontrada');
    if (i.estado !== 'ABIERTA') throw conflict('La incidencia ya está resuelta');
    await repository.resolver(idIncidencia, user.id, resolucion, db);
    await notificarUsuario(db, {
      idUsuario: i.reportada_por,
      tipo: 'INCIDENCIA_RESUELTA',
      titulo: `Se atendió la incidencia de ${i.nombre} ${i.apellido_paterno}`,
      mensaje: resolucion.slice(0, 300),
      entidad: 'incidencia',
      idEntidad: idIncidencia,
    });
    return repository.obtener(idIncidencia, db);
  });
}

module.exports = { registrar, listar, resolver };
