const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  listar: async (req, res) => res.json(camel(await service.listar(req.datosQuery, req.user))),
  solicitar: async (req, res) => res.status(201).json(camel(await service.solicitar(req.body, req.user))),
  atender: async (req, res) => res.json(camel(await service.atender(req.params.id, req.body, req.user))),
  decidir: async (req, res) => res.json(camel(await service.decidir(req.params.id, req.body, req.user))),
};
