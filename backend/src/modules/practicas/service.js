const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const { notificarUsuario, notificarRol } = require('../../utils/notificar');
const { generarCarta, fechaLarga } = require('../../utils/pdf');
const { enviarArchivo, borrarArchivo } = require('../../utils/archivos');
const { forbidden, notFound, conflict, badRequest } = require('../../utils/AppError');
const { esAdmin, tieneSubrol } = require('../../utils/sesion');
const { ESTADOS_PRACTICA, ESTADOS_TAREA } = require('shared/constants');

// Seguimiento (épico SIGEA-4) y cierre de la práctica.
// Transiciones de estado, horas mínimas y "solo admin cierra" las valida el
// trigger trg_practica_transiciones; aquí se valida quién hace cada cosa.

const nombre = (p) => [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ');

// Devuelve la práctica si el usuario puede verla: el alumno, su ofertador o un admin
async function practicaConAcceso(idPractica, user, db) {
  const p = await repository.obtener(idPractica, db);
  if (!p) throw notFound('Práctica no encontrada');
  const rol = p.id_usuario_alumno === user.id ? 'ALUMNO' : p.id_usuario_ofertador === user.id ? 'OFERTADOR' : null;
  if (!rol && !esAdmin(user)) throw forbidden('No tienes acceso a esta práctica');
  return { ...p, rolUsuario: rol ?? 'ADMIN' };
}

async function practicaDelOfertador(idPractica, idUsuario, db) {
  const p = await repository.obtener(idPractica, db);
  if (!p) throw notFound('Práctica no encontrada');
  if (p.id_usuario_ofertador !== idUsuario) throw forbidden('Esta práctica no es de tus vacantes');
  return p;
}

// ---------- consultas ----------

const mias = (idUsuario) => repository.deAlumno(idUsuario);
const deOfertador = (idUsuario, filtros) => repository.deOfertador(idUsuario, filtros);
const listar = (filtros) => repository.listar(filtros);
const resumen = () => repository.resumen();
const detalle = (idPractica, user) => practicaConAcceso(idPractica, user);

// ---------- cierre ----------

// Por horas: lo pide el alumno cuando junta las horas (el trigger las cuenta)
async function solicitarCierre(idPractica, user) {
  return withTransaction(async (db) => {
    const p = await repository.obtener(idPractica, db);
    if (!p) throw notFound('Práctica no encontrada');
    if (p.id_usuario_alumno !== user.id) throw forbidden('Esta práctica no es tuya');
    if (p.estado !== ESTADOS_PRACTICA.ACTIVA) throw conflict('Solo una práctica activa puede pedir su cierre');
    if (!p.horas_requeridas) {
      throw conflict('En prácticas por proyecto el cierre se pide cuando el ofertador marca el proyecto como completado');
    }
    await repository.solicitarCierre(idPractica, user.id, db);
    await notificarRol(db, {
      rol: 'ADMIN',
      subrol: 'ADMIN_ACADEMICO',
      tipo: 'CIERRE_SOLICITADO',
      titulo: `${nombre(p)} solicitó el cierre de su práctica`,
      mensaje: `${p.titulo} · ${p.empresa}`,
      entidad: 'practica',
      idEntidad: idPractica,
    });
    return repository.obtener(idPractica, db);
  });
}

// Por proyecto: lo marca el ofertador
async function proyectoCompletado(idPractica, user) {
  return withTransaction(async (db) => {
    const p = await practicaDelOfertador(idPractica, user.id, db);
    if (p.estado !== ESTADOS_PRACTICA.ACTIVA) throw conflict('La práctica no está activa');
    if (p.horas_requeridas) throw conflict('Esta práctica es por horas: el cierre lo solicita el alumno al completarlas');
    await repository.marcarProyectoCompletado(idPractica, user.id, db);
    await notificarRol(db, {
      rol: 'ADMIN',
      subrol: 'ADMIN_ACADEMICO',
      tipo: 'CIERRE_SOLICITADO',
      titulo: `Proyecto completado: ${p.titulo}`,
      mensaje: `${p.empresa} marcó como completado el proyecto de ${nombre(p)}`,
      entidad: 'practica',
      idEntidad: idPractica,
    });
    await notificarUsuario(db, {
      idUsuario: p.id_usuario_alumno,
      tipo: 'PROYECTO_COMPLETADO',
      titulo: 'Tu ofertador marcó tu proyecto como completado',
      mensaje: 'Administración revisará el cierre de tu práctica.',
      entidad: 'practica',
      idEntidad: idPractica,
    });
    return repository.obtener(idPractica, db);
  });
}

// El admin académico confirma el cierre o lo regresa a ACTIVA
async function resolverCierre(idPractica, { decision, observaciones }, user) {
  if (!tieneSubrol(user, 'ADMIN_ACADEMICO')) throw forbidden('Solo el Administrador Académico confirma cierres');
  if (decision === 'REABRIR' && !observaciones) throw badRequest('Explica por qué no se aprueba el cierre');
  return withTransaction(async (db) => {
    const p = await repository.obtener(idPractica, db);
    if (!p) throw notFound('Práctica no encontrada');
    if (p.estado !== ESTADOS_PRACTICA.EN_REVISION_CIERRE) throw conflict('Esta práctica no tiene un cierre pendiente');

    if (decision === 'CERRAR') {
      await repository.confirmarCierre(idPractica, user.id, observaciones, db);
    } else {
      await repository.reabrir(idPractica, observaciones, db);
    }
    const cerrada = decision === 'CERRAR';
    for (const idUsuario of [p.id_usuario_alumno, p.id_usuario_ofertador]) {
      await notificarUsuario(db, {
        idUsuario,
        tipo: cerrada ? 'PRACTICA_CERRADA' : 'CIERRE_RECHAZADO',
        titulo: cerrada ? `Práctica cerrada: ${p.titulo}` : `No se aprobó el cierre de: ${p.titulo}`,
        mensaje: observaciones || (cerrada ? 'La práctica concluyó oficialmente.' : null),
        entidad: 'practica',
        idEntidad: idPractica,
      });
    }
    return repository.obtener(idPractica, db);
  });
}

// ---------- tareas y evidencias ----------

async function tareas(idPractica, user) {
  await practicaConAcceso(idPractica, user);
  return repository.tareas(idPractica);
}

async function crearTarea(idPractica, datos, user) {
  return withTransaction(async (db) => {
    const p = await practicaDelOfertador(idPractica, user.id, db);
    const idTarea = await repository.crearTarea(idPractica, user.id, datos, db);
    await notificarUsuario(db, {
      idUsuario: p.id_usuario_alumno,
      tipo: 'TAREA_NUEVA',
      titulo: `Nueva tarea: ${datos.titulo}`,
      mensaje: `Fecha límite: ${datos.fechaLimite}`,
      entidad: 'practica',
      idEntidad: idPractica,
    });
    return repository.obtenerTarea(idTarea, db);
  });
}

async function entregarEvidencia(idTarea, archivo, user) {
  try {
    return await withTransaction(async (db) => {
      const t = await repository.obtenerTarea(idTarea, db);
      if (!t) throw notFound('Tarea no encontrada');
      if (t.id_usuario_alumno !== user.id) throw forbidden('Esta tarea no es tuya');
      if (t.estado === ESTADOS_TAREA.COMPLETADA) throw conflict('La tarea ya fue marcada como completada');
      if (t.estado_practica !== ESTADOS_PRACTICA.ACTIVA) throw conflict('La práctica no está activa');
      await repository.agregarEvidencia(
        idTarea,
        {
          nombreArchivo: archivo.nombreOriginal.slice(0, 200),
          rutaRelativa: archivo.rutaRelativa,
          mimeType: archivo.mimetype,
          subidoPor: user.id,
        },
        db,
      );
      if (t.estado === ESTADOS_TAREA.PENDIENTE) {
        await repository.cambiarEstadoTarea(idTarea, ESTADOS_TAREA.ENTREGADA, db);
        await notificarUsuario(db, {
          idUsuario: t.id_usuario_ofertador,
          tipo: 'TAREA_ENTREGADA',
          titulo: `Entregaron la tarea: ${t.titulo}`,
          entidad: 'practica',
          idEntidad: t.id_practica,
        });
      }
      return repository.obtenerTarea(idTarea, db);
    });
  } catch (err) {
    borrarArchivo(archivo.rutaRelativa);
    throw err;
  }
}

// El ofertador revisa la entrega: la da por buena o la devuelve a pendiente
async function revisarTarea(idTarea, { decision, comentario }, user) {
  return withTransaction(async (db) => {
    const t = await repository.obtenerTarea(idTarea, db);
    if (!t) throw notFound('Tarea no encontrada');
    if (t.id_usuario_ofertador !== user.id) throw forbidden('Esta tarea no es de tus practicantes');
    if (t.estado !== ESTADOS_TAREA.ENTREGADA) throw conflict('Solo se revisan tareas entregadas');
    const completada = decision === 'COMPLETAR';
    await repository.cambiarEstadoTarea(idTarea, completada ? ESTADOS_TAREA.COMPLETADA : ESTADOS_TAREA.PENDIENTE, db);
    await notificarUsuario(db, {
      idUsuario: t.id_usuario_alumno,
      tipo: completada ? 'TAREA_COMPLETADA' : 'TAREA_DEVUELTA',
      titulo: completada ? `Tarea aprobada: ${t.titulo}` : `Tarea devuelta: ${t.titulo}`,
      mensaje: comentario || null,
      entidad: 'practica',
      idEntidad: t.id_practica,
    });
    return repository.obtenerTarea(idTarea, db);
  });
}

async function enviarEvidencia(res, idEvidencia, user) {
  const ev = await repository.obtenerEvidencia(idEvidencia);
  if (!ev) throw notFound('Evidencia no encontrada');
  const t = await repository.obtenerTarea(ev.id_tarea);
  await practicaConAcceso(t.id_practica, user);
  return enviarArchivo(res, ev.ruta_relativa, ev.nombre_archivo);
}

// ---------- carta de aceptación ----------

async function generarCartaAceptacion(idPractica, user) {
  return withTransaction(async (db) => {
    const p = await practicaDelOfertador(idPractica, user.id, db);
    if (p.estado === ESTADOS_PRACTICA.BAJA) throw conflict('La práctica fue dada de baja');
    const existente = await repository.obtenerCartaAceptacion(idPractica, db);
    if (!existente) {
      const datos = {
        alumno: nombre(p),
        matricula: p.matricula,
        carrera: p.nombre_carrera,
        empresa: p.empresa,
        puesto: p.titulo,
        modalidad: p.modalidad_trabajo,
        tipoPractica: p.tipo_practica,
        horas: p.horas_requeridas,
        fechaInicio: p.fecha_inicio,
        ofertador: `${p.ofertador_nombre} ${p.ofertador_apellido}`,
        ofertadorPuesto: p.ofertador_puesto,
        fecha: new Date().toISOString(),
      };
      await repository.crearCartaAceptacion(idPractica, user.id, datos, db);
      await notificarUsuario(db, {
        idUsuario: p.id_usuario_alumno,
        tipo: 'CARTA_ACEPTACION',
        titulo: 'Tu carta de aceptación está disponible',
        entidad: 'practica',
        idEntidad: idPractica,
      });
    }
    return repository.obtener(idPractica, db);
  });
}

async function pdfCartaAceptacion(idPractica, user) {
  await practicaConAcceso(idPractica, user);
  const carta = await repository.obtenerCartaAceptacion(idPractica);
  if (!carta) throw notFound('El ofertador todavía no genera la carta de aceptación');
  const d = carta.datos;
  const duracion = d.horas ? `cubriendo un total de ${d.horas} horas` : 'bajo la modalidad de proyecto';
  return generarCarta({
    titulo: 'Carta de aceptación',
    folio: `CA-${new Date(carta.generada_en).getFullYear()}-${String(carta.id_carta_aceptacion).padStart(5, '0')}`,
    fecha: fechaLarga(d.fecha),
    destinatario: ['COORDINACIÓN DE PRÁCTICAS PROFESIONALES', 'P R E S E N T E'],
    parrafos: [
      `Por medio de la presente, ${d.empresa} hace constar que el (la) alumno(a) ${d.alumno}, con matrícula ` +
        `${d.matricula}, de la carrera de ${d.carrera}, ha sido aceptado(a) para realizar sus prácticas ` +
        `profesionales en el puesto de "${d.puesto}"${d.modalidad ? ` en modalidad ${d.modalidad.toLowerCase()}` : ''}, ` +
        `a partir del ${fechaLarga(`${d.fechaInicio}T12:00:00`)}, ${duracion}.`,
      'Durante este periodo el (la) alumno(a) desarrollará las actividades asignadas por su supervisor y registrará ' +
        'sus avances en el Sistema de Gestión de Prácticas Profesionales.',
      'Se extiende la presente para los fines académicos que al interesado(a) convengan.',
    ],
    firma: ['ATENTAMENTE', d.ofertador, [d.ofertadorPuesto, d.empresa].filter(Boolean).join(' · ')],
    piePagina: 'Documento generado por SIGEA a solicitud del ofertador.',
  });
}

module.exports = {
  practicaConAcceso, mias, deOfertador, listar, resumen, detalle,
  solicitarCierre, proyectoCompletado, resolverCierre,
  tareas, crearTarea, entregarEvidencia, revisarTarea, enviarEvidencia,
  generarCartaAceptacion, pdfCartaAceptacion,
};
