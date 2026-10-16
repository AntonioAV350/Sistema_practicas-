const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

// El alumno con sesión
router.get('/me', requireRole('ESTUDIANTE'), controller.miPerfil);
router.patch('/me', requireRole('ESTUDIANTE'), validate({ body: v.misDatosSchema }), controller.actualizarMisDatos);

// Administración (cualquier admin y el superadmin)
router.get('/', requireRole('ADMIN'), validate({ query: v.listarQuery }), controller.listar);
router.get('/:id', requireRole('ADMIN'), validate({ params: v.idParam }), controller.detalle);

module.exports = router;
