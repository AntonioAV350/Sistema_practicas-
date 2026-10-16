const repository = require('./repository');

module.exports = {
  carreras: () => repository.carreras(),
  tiposPractica: () => repository.tiposPractica(),
  categoriasIncidencia: () => repository.categoriasIncidencia(),
};
