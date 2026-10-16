const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

// El ofertador ve las suyas; los admins todas
router.get('/', requireRole('OFERTADOR', 'ADMIN'), validate({ query: v.listarQuery }), controller.listar);
router.post('/', requireRole('OFERTADOR'), validate({ body: v.incidenciaSchema }), controller.registrar);
router.patch(
  '/:id/resolver',
  requireRole('ADMIN_ACADEMICO'),
  validate({ params: v.idParam, body: v.resolverSchema }),
  controller.resolver,
);

module.exports = router;
