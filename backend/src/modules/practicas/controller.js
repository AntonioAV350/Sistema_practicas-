const service = require('./service');
const { camel } = require('../../utils/caso');

const enviarPdf = (res, buffer, nombre) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  res.send(buffer);
};

module.exports = {
  mias: async (req, res) => res.json(camel(await service.mias(req.user.id))),
  deOfertador: async (req, res) => res.json(camel(await service.deOfertador(req.user.id, req.datosQuery))),
  listar: async (req, res) => res.json(camel(await service.listar(req.datosQuery))),
  resumen: async (req, res) => res.json(camel(await service.resumen())),
  detalle: async (req, res) => res.json(camel(await service.detalle(req.params.id, req.user))),

  solicitarCierre: async (req, res) => res.json(camel(await service.solicitarCierre(req.params.id, req.user))),
  proyectoCompletado: async (req, res) => res.json(camel(await service.proyectoCompletado(req.params.id, req.user))),
  resolverCierre: async (req, res) => res.json(camel(await service.resolverCierre(req.params.id, req.body, req.user))),

  tareas: async (req, res) => res.json(camel(await service.tareas(req.params.id, req.user))),
  crearTarea: async (req, res) => res.status(201).json(camel(await service.crearTarea(req.params.id, req.body, req.user))),
  entregarEvidencia: async (req, res) =>
    res.status(201).json(camel(await service.entregarEvidencia(req.params.id, req.file, req.user))),
  revisarTarea: async (req, res) => res.json(camel(await service.revisarTarea(req.params.id, req.body, req.user))),
  evidencia: (req, res) => service.enviarEvidencia(res, req.params.id, req.user),

  generarCartaAceptacion: async (req, res) =>
    res.status(201).json(camel(await service.generarCartaAceptacion(req.params.id, req.user))),
  pdfCartaAceptacion: async (req, res) =>
    enviarPdf(res, await service.pdfCartaAceptacion(req.params.id, req.user), `carta-aceptacion-${req.params.id}.pdf`),
};
