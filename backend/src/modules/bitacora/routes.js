const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

// :id = id de la práctica (el servicio valida que sea del alumno, su ofertador o un admin)
router.get('/practica/:id', validate({ params: v.idParam }), controller.listar);
router.post(
  '/practica/:id',
  requireRole('ESTUDIANTE'),
  validate({ params: v.idParam, body: v.registroSchema }),
  controller.registrar,
);
// :id = id del registro
router.delete('/:id', requireRole('ESTUDIANTE'), validate({ params: v.idParam }), controller.eliminar);

module.exports = router;
