const repository = require('./repository');
const { notFound } = require('../../utils/AppError');

const listar = (idUsuario, filtros) => repository.listar(idUsuario, filtros);
const conteo = async (idUsuario) => ({ noLeidas: await repository.contarNoLeidas(idUsuario) });

async function marcarLeida(idUsuario, idNotificacion) {
  if (!(await repository.marcarLeida(idUsuario, idNotificacion))) throw notFound('Notificación no encontrada');
}

const marcarTodas = async (idUsuario) => ({ actualizadas: await repository.marcarTodas(idUsuario) });

module.exports = { listar, conteo, marcarLeida, marcarTodas };
