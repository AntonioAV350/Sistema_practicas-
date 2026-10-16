const repository = require('./repository');
const authRepository = require('../auth/repository');
const { AppError } = require('../../utils/AppError');

// Perfil del ofertador con sesión. Lo usan vacantes, prácticas, incidencias y bajas.
async function perfilDeUsuario(idUsuario, db) {
  const perfil = await repository.perfilPorUsuario(idUsuario, db);
  if (!perfil) {
    throw new AppError(403, 'SIN_PERFIL_OFERTADOR', 'Tu cuenta no tiene datos de ofertador; pide al superadministrador que los registre');
  }
  return perfil;
}

const miPerfil = (idUsuario) => perfilDeUsuario(idUsuario);

// El ofertador solo puede cambiar sus datos de contacto y su puesto
async function actualizarMiPerfil(idUsuario, datos) {
  await perfilDeUsuario(idUsuario);
  await authRepository.updateUser(idUsuario, { telefono: datos.telefono });
  if (datos.puesto !== undefined) await repository.actualizar(idUsuario, { puesto: datos.puesto });
  return repository.perfilPorUsuario(idUsuario);
}

const listar = () => repository.listar();

module.exports = { perfilDeUsuario, miPerfil, actualizarMiPerfil, listar };
