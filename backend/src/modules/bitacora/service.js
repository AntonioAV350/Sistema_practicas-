const repository = require('./repository');
const practicas = require('../practicas/service');
const { forbidden, notFound, conflict } = require('../../utils/AppError');
const { ESTADOS_PRACTICA } = require('shared/constants');
const { hoy } = require('../practicas/validators');

// SIGEA-32: bitácora diaria obligatoria del alumno. Puede haber varias
// entradas por día (máx. 24 h en total). La BD exige práctica ACTIVA y
// fecha no futura; las alertas por días sin registro las manda el job.

async function listar(idPractica, user) {
  const p = await practicas.practicaConAcceso(idPractica, user);
  return { avance: avance(p), registros: await repository.listar(idPractica) };
}

const avance = (p) => ({
  horasAcumuladas: p.horas_acumuladas,
  horasRequeridas: p.horas_requeridas,
  diasSinRegistro: p.dias_sin_registro,
  ultimaFecha: p.ultima_fecha_bitacora,
});

async function registrar(idPractica, datos, user) {
  const p = await practicas.practicaConAcceso(idPractica, user);
  if (p.rolUsuario !== 'ALUMNO') throw forbidden('Solo el alumno registra su bitácora');
  if (p.estado !== ESTADOS_PRACTICA.ACTIVA) throw conflict('Solo puedes registrar bitácora mientras tu práctica está activa');
  if (datos.fecha < p.fecha_inicio) throw conflict('La fecha es anterior al inicio de tu práctica');
  const yaRegistradas = await repository.horasDelDia(idPractica, datos.fecha);
  if (yaRegistradas + datos.horas > 24) {
    throw conflict(`Ese día ya tiene ${yaRegistradas} h registradas; no puede pasar de 24 h`);
  }
  const idRegistro = await repository.crear(idPractica, datos);
  return repository.obtener(idRegistro);
}

// Solo se pueden borrar registros del mismo día (para corregir errores de captura)
async function eliminar(idRegistro, user) {
  const r = await repository.obtener(idRegistro);
  if (!r) throw notFound('Registro no encontrado');
  const p = await practicas.practicaConAcceso(r.id_practica, user);
  if (p.rolUsuario !== 'ALUMNO') throw forbidden('Solo el alumno puede corregir su bitácora');
  if (p.estado !== ESTADOS_PRACTICA.ACTIVA) throw conflict('La práctica ya no está activa');
  const capturadoHoy = new Date(r.creado_en).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) === hoy();
  if (!capturadoHoy) throw conflict('Solo puedes eliminar registros capturados hoy');
  await repository.eliminar(idRegistro);
}

module.exports = { listar, registrar, eliminar };
