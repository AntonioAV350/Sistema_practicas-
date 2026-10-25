const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  listar: async (req, res) => res.json(camel(await service.listar(req.datosQuery, req.user))),
  registrar: async (req, res) => res.status(201).json(camel(await service.registrar(req.body, req.user))),
  resolver: async (req, res) => res.json(camel(await service.resolver(req.params.id, req.body.resolucion, req.user))),
};
