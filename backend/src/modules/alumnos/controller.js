const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  miPerfil: async (req, res) => res.json(camel(await service.miPerfil(req.user.id))),
  actualizarMisDatos: async (req, res) => res.json(camel(await service.actualizarMisDatos(req.user.id, req.body))),
  listar: async (req, res) => res.json(camel(await service.listar(req.datosQuery))),
  detalle: async (req, res) => res.json(camel(await service.detalle(req.params.id))),
};
