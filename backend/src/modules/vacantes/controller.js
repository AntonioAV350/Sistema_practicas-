const service = require('./service');
const { camel } = require('../../utils/caso');

const json = (res, status = 200) => (data) => res.status(status).json(camel(data));

module.exports = {
  // vacantes
  abiertas: async (req, res) => json(res)(await service.abiertas(req.user.id, req.datosQuery)),
  elegibilidad: async (req, res) => res.json(await service.elegibilidad(req.user.id)),
  misVacantes: async (req, res) => json(res)(await service.misVacantes(req.user.id)),
  todas: async (req, res) => json(res)(await service.todas(req.datosQuery)),
  detalle: async (req, res) => json(res)(await service.detalle(req.params.id, req.user)),
  crear: async (req, res) => json(res, 201)(await service.crear(req.user.id, req.body)),
  actualizar: async (req, res) => json(res)(await service.actualizar(req.user.id, req.params.id, req.body)),
  cambiarEstado: async (req, res) => json(res)(await service.cambiarEstado(req.user.id, req.params.id, req.body.estado)),
  // postulaciones
  postulantes: async (req, res) => json(res)(await service.postulantes(req.params.id, req.user)),
  postular: async (req, res) => json(res, 201)(await service.postular(req.user.id, req.params.id)),
  misPostulaciones: async (req, res) => json(res)(await service.misPostulaciones(req.user.id)),
  retirar: async (req, res) => json(res)(await service.retirar(req.user.id, req.params.id)),
  aceptar: async (req, res) => json(res, 201)(await service.aceptar(req.user.id, req.params.id)),
  descartar: async (req, res) => json(res)(await service.descartar(req.user.id, req.params.id)),
  // aceptaciones
  confirmar: async (req, res) => res.status(201).json(await service.confirmar(req.user.id, req.params.id)),
  rechazar: async (req, res) => json(res)(await service.rechazar(req.user.id, req.params.id)),
  cancelar: async (req, res) => json(res)(await service.cancelar(req.user.id, req.params.id)),
};
