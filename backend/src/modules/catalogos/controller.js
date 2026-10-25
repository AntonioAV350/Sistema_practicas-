const service = require('./service');
const { camel } = require('../../utils/caso');

module.exports = {
  carreras: async (req, res) => res.json(camel(await service.carreras())),
  tiposPractica: async (req, res) => res.json(camel(await service.tiposPractica())),
  categoriasIncidencia: async (req, res) => res.json(camel(await service.categoriasIncidencia())),
};
