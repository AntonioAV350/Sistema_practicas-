const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  miPerfil: async (req, res) => res.json(camel(await service.miPerfil(req.user.id))),
  actualizarMiPerfil: async (req, res) => res.json(camel(await service.actualizarMiPerfil(req.user.id, req.body))),
  listar: async (req, res) => res.json(camel(await service.listar())),
  resumen: async (req, res) => res.json(camel(await service.resumen(req.user.id))),
};
