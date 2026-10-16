const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  listar: async (req, res) => res.json(camel(await service.listar(req.params.id, req.user))),
  registrar: async (req, res) => res.status(201).json(camel(await service.registrar(req.params.id, req.body, req.user))),
  eliminar: async (req, res) => {
    await service.eliminar(req.params.id, req.user);
    res.status(204).end();
  },
};
