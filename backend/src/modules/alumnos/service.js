const bcrypt = require('bcrypt');
const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const authRepository = require('../auth/repository');
const { AppError, notFound, conflict, badRequest } = require('../../utils/AppError');
const { ROLES } = require('shared/constants');

// Perfil del alumno que tiene la sesión. Lo usan los demás módulos.
async function perfilDeUsuario(idUsuario, db) {
  const perfil = await repository.perfilPorUsuario(idUsuario, db);
  if (!perfil) throw new AppError(403, 'SIN_PERFIL_ALUMNO', 'Tu cuenta no tiene datos de alumno registrados');
  return perfil;
}

async function validarCarrera(idCarrera, numeroPeriodo, db) {
  const carrera = await repository.carrera(idCarrera, db);
  if (!carrera) throw badRequest('La carrera seleccionada no existe');
  if (numeroPeriodo > carrera.total_periodos) {
    throw badRequest(`Tu carrera tiene ${carrera.total_periodos} periodos; revisa el periodo que cursas`);
  }
  return carrera;
}

// Auto-registro del alumno: usuario + rol ESTUDIANTE + datos académicos
// + inscripción al ciclo vigente. Todo o nada.
async function registrar(datos) {
  return withTransaction(async (db) => {
    if (await authRepository.emailEnUso(datos.email, null, db)) {
      throw conflict('Ese correo ya está registrado', 'EMAIL_DUPLICADO');
    }
    if (await repository.matriculaEnUso(datos.matricula, null, db)) {
      throw conflict('Esa matrícula ya está registrada', 'MATRICULA_DUPLICADA');
    }
    const carrera = await validarCarrera(datos.idCarrera, datos.numeroPeriodo, db);

    const username = await authRepository.usernameDisponible(datos.matricula, db);
    const usuario = await authRepository.createUser(
      {
        username,
        email: datos.email,
        passwordHash: await bcrypt.hash(datos.password, 10),
        nombre: datos.nombre,
        apellidoPaterno: datos.apellidoPaterno,
        apellidoMaterno: datos.apellidoMaterno,
        telefono: datos.telefono,
      },
      db,
    );
    await authRepository.assignRole(usuario.id_usuario, ROLES.ESTUDIANTE, null, null, db);
    const idAlumno = await repository.crear(
      { idUsuario: usuario.id_usuario, matricula: datos.matricula, idCarrera: datos.idCarrera, grupo: datos.grupo },
      db,
    );
    const idCiclo = await repository.cicloVigente(carrera.id_tipo_periodo, db);
    if (idCiclo) await repository.guardarInscripcion(idAlumno, idCiclo, datos.numeroPeriodo, datos.grupo, db);

    return authRepository.getUserById(usuario.id_usuario, db);
  });
}

const miPerfil = (idUsuario) => perfilDeUsuario(idUsuario);

// El alumno edita sus datos. Matrícula y carrera se bloquean en cuanto genera
// su primera carta, porque la carta ya los lleva impresos.
async function actualizarMisDatos(idUsuario, datos) {
  return withTransaction(async (db) => {
    const perfil = await perfilDeUsuario(idUsuario, db);
    const cambiaIdentidad =
      (datos.matricula && datos.matricula.toUpperCase() !== perfil.matricula) ||
      (datos.idCarrera && datos.idCarrera !== perfil.id_carrera);
    if (cambiaIdentidad && (await repository.tieneCartas(perfil.id_alumno, db))) {
      throw conflict('Ya generaste una carta de presentación: la matrícula y la carrera ya no se pueden cambiar');
    }
    if (datos.matricula && (await repository.matriculaEnUso(datos.matricula, perfil.id_alumno, db))) {
      throw conflict('Esa matrícula ya está registrada', 'MATRICULA_DUPLICADA');
    }

    const idCarrera = datos.idCarrera ?? perfil.id_carrera;
    const numeroPeriodo = datos.numeroPeriodo ?? perfil.numero_periodo;
    const carrera = await validarCarrera(idCarrera, numeroPeriodo ?? 1, db);

    await authRepository.updateUser(
      idUsuario,
      {
        nombre: datos.nombre,
        apellidoPaterno: datos.apellidoPaterno,
        apellidoMaterno: datos.apellidoMaterno,
        telefono: datos.telefono,
      },
      db,
    );
    await repository.actualizar(perfil.id_alumno, datos, db);

    if (numeroPeriodo) {
      const idCiclo = await repository.cicloVigente(carrera.id_tipo_periodo, db);
      if (idCiclo) {
        await repository.guardarInscripcion(perfil.id_alumno, idCiclo, numeroPeriodo, datos.grupo ?? perfil.grupo, db);
      }
    }
    return repository.perfilPorUsuario(idUsuario, db);
  });
}

const listar = (filtros) => repository.listar(filtros);

async function detalle(idAlumno) {
  const perfil = await repository.perfilPorId(idAlumno);
  if (!perfil) throw notFound('Alumno no encontrado');
  return { ...perfil, ...(await repository.historial(idAlumno)) };
}

module.exports = { perfilDeUsuario, registrar, miPerfil, actualizarMisDatos, listar, detalle };
