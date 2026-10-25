const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('OFERTADOR', 'ADMIN'), validate({ query: v.listarQuery }), controller.listar);
// 1. El ofertador solicita
router.post('/', requireRole('OFERTADOR'), validate({ body: v.solicitudSchema }), controller.solicitar);
// 2. El admin académico resuelve sin baja o escala
router.patch(
  '/:id/atender',
  requireRole('ADMIN_ACADEMICO'),
  validate({ params: v.idParam, body: v.atenderSchema }),
  controller.atender,
);
// 3. El superadmin aprueba o rechaza
router.patch('/:id/decidir', requireRole('SUPERADMIN'), validate({ params: v.idParam, body: v.decidirSchema }), controller.decidir);

module.exports = router;
