const bcrypt = require('bcrypt');
const { withTransaction } = require('../../config/db');
const repository = require('./repository');
const authRepository = require('../auth/repository');
const ofertadoresRepository = require('../ofertadores/repository');
const { notFound, conflict, badRequest } = require('../../utils/AppError');
const { ROLES } = require('shared/constants');

// Gestión de cuentas (SIGEA-10/26/27): solo el superadmin.
// Los alumnos se registran solos; aquí se dan de alta admins y ofertadores.

async function validarCorreo(email, exceptoId, db) {
  if (await authRepository.emailEnUso(email, exceptoId, db)) {
    throw conflict('Ese correo ya está registrado en otra cuenta', 'EMAIL_DUPLICADO');
  }
}

async function validarEmpresa(tipo, idEmpresa, db) {
  if (tipo !== 'EXTERNO') return;
  if (!idEmpresa) throw badRequest('Un ofertador externo necesita una empresa');
  const empresa = await repository.empresa(idEmpresa, db);
  if (!empresa) throw badRequest('La empresa no existe');
  if (!empresa.activa) throw conflict('La empresa está desactivada');
}

async function crearUsuarioBase(datos, db) {
  await validarCorreo(datos.email, null, db);
  const username = await authRepository.usernameDisponible(datos.email.split('@')[0], db);
  return authRepository.createUser(
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
}

async function crearAdmin(datos, idSuperadmin) {
  return withTransaction(async (db) => {
    const usuario = await crearUsuarioBase(datos, db);
    return authRepository.assignRole(usuario.id_usuario, ROLES.ADMIN, datos.subrol, idSuperadmin, db);
  });
}

async function crearOfertador(datos, idSuperadmin) {
  return withTransaction(async (db) => {
    await validarEmpresa(datos.tipo, datos.idEmpresa, db);
    const usuario = await crearUsuarioBase(datos, db);
    await authRepository.assignRole(usuario.id_usuario, ROLES.OFERTADOR, null, idSuperadmin, db);
    await ofertadoresRepository.crear(
      { idUsuario: usuario.id_usuario, tipo: datos.tipo, idEmpresa: datos.idEmpresa, puesto: datos.puesto, registradoPor: idSuperadmin },
      db,
    );
    return authRepository.getUserById(usuario.id_usuario, db);
  });
}

async function actualizar(idUsuario, datos) {
  return withTransaction(async (db) => {
    const roles = await repository.clavesDeRoles(idUsuario, db);
    if (!roles.length) throw notFound('Cuenta no encontrada');
    if (datos.email) await validarCorreo(datos.email, idUsuario, db);

    await authRepository.updateUser(
      idUsuario,
      {
        nombre: datos.nombre,
        apellidoPaterno: datos.apellidoPaterno,
        apellidoMaterno: datos.apellidoMaterno,
        email: datos.email,
        telefono: datos.telefono,
      },
      db,
    );

    if (datos.subrol && roles.includes(ROLES.ADMIN)) {
      await repository.cambiarSubrolAdmin(idUsuario, datos.subrol, db);
    }
    if (roles.includes(ROLES.OFERTADOR) && (datos.tipo || datos.idEmpresa || datos.puesto !== undefined)) {
      const actual = await ofertadoresRepository.perfilPorUsuario(idUsuario, db);
      const tipo = datos.tipo ?? actual.tipo;
      await validarEmpresa(tipo, datos.idEmpresa ?? actual.id_empresa, db);
      await ofertadoresRepository.actualizar(idUsuario, { tipo, idEmpresa: datos.idEmpresa, puesto: datos.puesto }, db);
    }
    return authRepository.getUserById(idUsuario, db);
  });
}

async function cambiarActivo(idUsuario, activo, idSuperadmin) {
  if (idUsuario === idSuperadmin && !activo) throw conflict('No puedes desactivar tu propia cuenta');
  if (!(await repository.setActivo(idUsuario, activo))) throw notFound('Cuenta no encontrada');
}

async function restablecerPassword(idUsuario, password) {
  const user = await authRepository.getUserById(idUsuario);
  if (!user) throw notFound('Cuenta no encontrada');
  await authRepository.setPassword(idUsuario, await bcrypt.hash(password, 10));
}

const listar = (filtros) => repository.listar(filtros);

// --- Empresas ---

const listarEmpresas = () => repository.listarEmpresas();
const crearEmpresa = (datos) => repository.crearEmpresa(datos);

async function actualizarEmpresa(idEmpresa, datos) {
  const empresa = await repository.actualizarEmpresa(idEmpresa, datos);
  if (!empresa) throw notFound('Empresa no encontrada');
  return empresa;
}

module.exports = {
  listar, crearAdmin, crearOfertador, actualizar, cambiarActivo, restablecerPassword,
  listarEmpresas, crearEmpresa, actualizarEmpresa,
};
