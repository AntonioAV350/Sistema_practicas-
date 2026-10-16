const service = require('./service');
const { camel } = require('../../utils/caso');

async function listar(req, res) {
  res.json(camel(await service.listar(req.user.id, req.datosQuery)));
}

async function conteo(req, res) {
  res.json(await service.conteo(req.user.id));
}

async function marcarLeida(req, res) {
  await service.marcarLeida(req.user.id, req.params.id);
  res.status(204).end();
}

async function marcarTodas(req, res) {
  res.json(await service.marcarTodas(req.user.id));
}

module.exports = { listar, conteo, marcarLeida, marcarTodas };
