const service = require('./service');
const { camel } = require('../../utils/caso');

// La ruta física del escaneo no se expone; el frontend lo pide por /cartas/:id/escaneo
const publica = (c) => {
  const { rutaEscaneo, ...resto } = camel(c);
  return { ...resto, tieneEscaneo: !!rutaEscaneo };
};

module.exports = {
  misCartas: async (req, res) => res.json((await service.misCartas(req.user.id)).map(publica)),
  generar: async (req, res) => res.status(201).json(publica(await service.generar(req.user.id))),
  pdf: async (req, res) => {
    const buffer = await service.pdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="carta-presentacion-${req.params.id}.pdf"`);
    res.send(buffer);
  },
  subirEscaneo: async (req, res) => res.json(publica(await service.subirEscaneo(req.user.id, req.params.id, req.file))),
  escaneo: (req, res) => service.enviarEscaneo(res, req.params.id, req.user),
  revisar: async (req, res) => res.json(publica(await service.revisar(req.params.id, req.body, req.user))),
  listar: async (req, res) => res.json((await service.listar(req.datosQuery)).map(publica)),
};
