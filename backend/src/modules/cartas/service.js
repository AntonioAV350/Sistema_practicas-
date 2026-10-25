const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const alumnos = require('../alumnos/service');
const { generarCarta, fechaLarga, INSTITUCION } = require('../../utils/pdf');
const { enviarArchivo, borrarArchivo } = require('../../utils/archivos');
const { forbidden, notFound, conflict, badRequest } = require('../../utils/AppError');
const { esAdmin, tieneSubrol } = require('../../utils/sesion');
const { ESTADOS_CARTA } = require('shared/constants');

// Carta de presentación: GENERADA -> ESCANEO_SUBIDO -> APROBADA | RECHAZADA.
// Si la rechazan, el alumno genera otra. La BD no valida el orden de los
// estados, así que se valida aquí.

const folio = (c) => `CP-${new Date(c.generada_en).getFullYear()}-${String(c.id_carta).padStart(5, '0')}`;

async function misCartas(idUsuario) {
  const perfil = await alumnos.perfilDeUsuario(idUsuario);
  return (await repository.listarPorAlumno(perfil.id_alumno)).map((c) => ({ ...c, folio: folio(c) }));
}

async function generar(idUsuario) {
  return withTransaction(async (db) => {
    const p = await alumnos.perfilDeUsuario(idUsuario, db);
    const vigente = await repository.vigentePorAlumno(p.id_alumno, db);
    if (vigente) {
      const motivo = {
        GENERADA: 'Ya tienes una carta generada: descárgala, fírmala y sube el escaneo.',
        ESCANEO_SUBIDO: 'Tu carta está en revisión.',
        APROBADA: 'Tu carta ya fue aprobada.',
      }[vigente.estado];
      throw conflict(motivo, 'CARTA_EN_CURSO');
    }
    if (!p.numero_periodo) {
      throw conflict(`Registra en "Mis datos" el ${p.tipo_periodo} que cursas en el ciclo actual antes de generar tu carta`);
    }
    if (p.numero_periodo < p.periodo_minimo_practicas) {
      throw conflict(`Puedes solicitar tu carta a partir del ${p.periodo_minimo_practicas}° ${p.tipo_periodo}`);
    }

    // Foto de los datos al momento de generarla
    const datos = {
      nombreCompleto: [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' '),
      matricula: p.matricula,
      carrera: p.nombre_carrera,
      periodo: p.numero_periodo,
      tipoPeriodo: p.tipo_periodo,
      grupo: p.grupo,
      ciclo: p.ciclo_actual,
      email: p.email,
      fecha: new Date().toISOString(),
    };
    const idCarta = await repository.crear(p.id_alumno, datos, db);
    const carta = await repository.obtener(idCarta, db);
    return { ...carta, folio: folio(carta) };
  });
}

async function cartaConAcceso(idCarta, user) {
  const carta = await repository.obtener(idCarta);
  if (!carta) throw notFound('Carta no encontrada');
  if (carta.id_usuario_alumno === user.id || esAdmin(user)) return carta;
  if (await repository.ofertadorTieneAcceso(idCarta, user.id)) return carta;
  throw forbidden('No tienes acceso a esta carta');
}

async function pdf(idCarta, user) {
  const carta = await cartaConAcceso(idCarta, user);
  const d = carta.datos;
  return generarCarta({
    titulo: 'Carta de presentación',
    folio: folio(carta),
    fecha: `Tuxtla Gutiérrez, Chiapas, a ${fechaLarga(d.fecha)}`,
    destinatario: ['A QUIEN CORRESPONDA', 'P R E S E N T E'],
    parrafos: [
      `Por medio de la presente, la ${INSTITUCION} presenta a ${d.nombreCompleto}, con matrícula ${d.matricula}, ` +
        `alumno(a) del ${d.periodo}° ${d.tipoPeriodo || 'periodo'}, grupo ${d.grupo}, de la carrera de ${d.carrera}` +
        `${d.ciclo ? `, inscrito(a) en el ciclo escolar ${d.ciclo}` : ''}.`,
      'El (la) alumno(a) cumple con los requisitos académicos para realizar sus prácticas profesionales, ' +
        'por lo que solicitamos atentamente su apoyo para que pueda llevarlas a cabo en su organización, ' +
        'conforme a la normativa vigente de prácticas profesionales y residencias.',
      'Agradecemos de antemano la atención y el apoyo brindado a nuestros estudiantes.',
    ],
    firma: ['ATENTAMENTE', 'Coordinación de Prácticas Profesionales', INSTITUCION],
    piePagina: `Documento generado por SIGEA · Folio ${folio(carta)} · Debe llevar sello y firma de la institución.`,
  });
}

async function subirEscaneo(idUsuario, idCarta, archivo) {
  try {
    return await withTransaction(async (db) => {
      const carta = await repository.obtener(idCarta, db);
      if (!carta) throw notFound('Carta no encontrada');
      if (carta.id_usuario_alumno !== idUsuario) throw forbidden('Esta carta no es tuya');
      if (![ESTADOS_CARTA.GENERADA, ESTADOS_CARTA.ESCANEO_SUBIDO].includes(carta.estado)) {
        throw conflict('Esta carta ya fue revisada; si la rechazaron, genera una nueva');
      }
      await repository.guardarEscaneo(idCarta, archivo.rutaRelativa, db);
      if (carta.ruta_escaneo) borrarArchivo(carta.ruta_escaneo);
      return repository.obtener(idCarta, db);
    });
  } catch (err) {
    borrarArchivo(archivo.rutaRelativa); // no dejar archivos huérfanos
    throw err;
  }
}

async function enviarEscaneo(res, idCarta, user) {
  const carta = await cartaConAcceso(idCarta, user);
  if (!carta.ruta_escaneo) throw notFound('Esta carta todavía no tiene escaneo');
  return enviarArchivo(res, carta.ruta_escaneo, `carta-${folio(carta)}${carta.ruta_escaneo.slice(-4)}`);
}

async function revisar(idCarta, { decision, comentarios }, user) {
  if (!tieneSubrol(user, 'ADMIN_DOCUMENTAL')) throw forbidden('Solo el Administrador Documental revisa cartas');
  if (decision === ESTADOS_CARTA.RECHAZADA && !comentarios) {
    throw badRequest('Escribe el motivo del rechazo para que el alumno lo corrija');
  }
  return withTransaction(async (db) => {
    const carta = await repository.obtener(idCarta, db);
    if (!carta) throw notFound('Carta no encontrada');
    if (carta.estado !== ESTADOS_CARTA.ESCANEO_SUBIDO) {
      throw conflict('Solo se pueden revisar cartas con el escaneo subido');
    }
    await repository.revisar(idCarta, { estado: decision, idRevisor: user.id, comentarios }, db);
    return repository.obtener(idCarta, db);
  });
}

const listar = async (filtros) => (await repository.listar(filtros)).map((c) => ({ ...c, folio: folio(c) }));

module.exports = { misCartas, generar, pdf, subirEscaneo, enviarEscaneo, revisar, listar };
