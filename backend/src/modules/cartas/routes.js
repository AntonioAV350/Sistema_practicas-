const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const { subirArchivo } = require('../../utils/archivos');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

// Alumno
router.get('/mias', requireRole('ESTUDIANTE'), controller.misCartas);
router.post('/', requireRole('ESTUDIANTE'), controller.generar);
router.post(
  '/:id/escaneo',
  requireRole('ESTUDIANTE'),
  validate({ params: v.idParam }),
  subirArchivo('cartas'),
  controller.subirEscaneo,
);

// Descargas: el servicio valida que sea el alumno dueño, un admin o el ofertador de su práctica
router.get('/:id/pdf', validate({ params: v.idParam }), controller.pdf);
router.get('/:id/escaneo', validate({ params: v.idParam }), controller.escaneo);

// Administración (bandeja de revisión del admin documental)
router.get('/', requireRole('ADMIN'), validate({ query: v.listarQuery }), controller.listar);
router.patch(
  '/:id/revision',
  requireRole('ADMIN_DOCUMENTAL'),
  validate({ params: v.idParam, body: v.revisionSchema }),
  controller.revisar,
);

module.exports = router;
