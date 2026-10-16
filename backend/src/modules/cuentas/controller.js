const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  listar: async (req, res) => res.json(camel(await service.listar(req.datosQuery))),
  crearAdmin: async (req, res) => res.status(201).json(camel(await service.crearAdmin(req.body, req.user.id))),
  crearOfertador: async (req, res) => res.status(201).json(camel(await service.crearOfertador(req.body, req.user.id))),
  actualizar: async (req, res) => res.json(camel(await service.actualizar(req.params.id, req.body))),
  cambiarActivo: async (req, res) => {
    await service.cambiarActivo(req.params.id, req.body.activo, req.user.id);
    res.status(204).end();
  },
  restablecerPassword: async (req, res) => {
    await service.restablecerPassword(req.params.id, req.body.password);
    res.status(204).end();
  },
  listarEmpresas: async (req, res) => res.json(camel(await service.listarEmpresas())),
  crearEmpresa: async (req, res) => res.status(201).json(camel(await service.crearEmpresa(req.body))),
  actualizarEmpresa: async (req, res) => res.json(camel(await service.actualizarEmpresa(req.params.id, req.body))),
};
