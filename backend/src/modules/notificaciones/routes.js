const express = require('express');
const authenticate = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

// Cada usuario solo ve y marca sus propias notificaciones
const router = express.Router();
router.use(authenticate);

router.get('/', validate({ query: v.listarQuery }), controller.listar);
router.get('/conteo', controller.conteo);
router.patch('/leidas', controller.marcarTodas);
router.patch('/:id/leida', validate({ params: v.idParam }), controller.marcarLeida);

module.exports = router;
