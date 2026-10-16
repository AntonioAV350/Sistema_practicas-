const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const practicas = require('../practicas/service');
const { notificarUsuario } = require('../../utils/notificar');
const { forbidden, notFound, conflict, badRequest } = require('../../utils/AppError');
const { esAdmin, esSuperadmin, tieneSubrol } = require('../../utils/sesion');
const { ESTADOS_BAJA } = require('shared/constants');

// Bajas en tres pasos: Ofertador solicita -> Administrador Académico resuelve
// sin baja o escala -> Superadministrador aprueba o rechaza en definitiva.
// Las transiciones y quién puede hacer cada una las garantiza trg_baja_transiciones;
// al aprobar, trg_baja_efectos deja la práctica en BAJA y avisa al alumno.

async function solicitar(datos, user) {
  const p = await practicas.practicaConAcceso(datos.idPractica, user);
  if (p.rolUsuario !== 'OFERTADOR') throw forbidden('Solo el ofertador de la práctica solicita la baja');
  if (datos.idIncidencia && !(await repository.incidenciaDePractica(datos.idIncidencia, datos.idPractica))) {
    throw badRequest('La incidencia no pertenece a esta práctica');
  }
  try {
    const id = await repository.crear(datos.idPractica, user.id, datos);
    return repository.obtener(id);
  } catch (err) {
    if (err.code === '23505') throw conflict('Esta práctica ya tiene una solicitud de baja en curso');
    throw err;
  }
}

function listar(filtros, user) {
  if (esAdmin(user)) return repository.listar(filtros);
  return repository.listar({ ...filtros, idUsuarioOfertador: user.id });
}

async function atender(idSolicitud, { decision, nota }, user) {
  if (!tieneSubrol(user, 'ADMIN_ACADEMICO')) throw forbidden('Esto lo atiende el Administrador Académico');
  return withTransaction(async (db) => {
    const b = await repository.obtener(idSolicitud, db);
    if (!b) throw notFound('Solicitud no encontrada');
    if (b.estado !== ESTADOS_BAJA.EN_REVISION_ACADEMICA) throw conflict('Esta solicitud ya fue atendida');
    await repository.atender(idSolicitud, decision, user.id, nota, db);
    return repository.obtener(idSolicitud, db);
  });
}

async function decidir(idSolicitud, { decision, comentario }, user) {
  if (!esSuperadmin(user)) throw forbidden('Solo el Superadministrador decide las bajas');
  return withTransaction(async (db) => {
    const b = await repository.obtener(idSolicitud, db);
    if (!b) throw notFound('Solicitud no encontrada');
    if (b.estado !== ESTADOS_BAJA.ESCALADA) throw conflict('Solo se deciden solicitudes escaladas');
    await repository.decidir(idSolicitud, decision, user.id, comentario, db);
    // El trigger avisa al alumno si se aprueba; si se rechaza, también debe saberlo
    if (decision === ESTADOS_BAJA.RECHAZADA) {
      await notificarUsuario(db, {
        idUsuario: b.id_usuario_alumno,
        tipo: 'BAJA_RECHAZADA',
        titulo: 'Se rechazó la solicitud de baja de tu práctica',
        mensaje: 'Tu práctica continúa normalmente.',
        entidad: 'practica',
        idEntidad: b.id_practica,
      });
    }
    return repository.obtener(idSolicitud, db);
  });
}

module.exports = { solicitar, listar, atender, decidir };
