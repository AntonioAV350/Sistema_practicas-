const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

router.get('/me', requireRole('OFERTADOR'), controller.miPerfil);
router.get('/resumen', requireRole('OFERTADOR'), controller.resumen);
router.patch('/me', requireRole('OFERTADOR'), validate({ body: v.miPerfilSchema }), controller.actualizarMiPerfil);

router.get('/', requireRole('ADMIN'), controller.listar);

module.exports = router;
