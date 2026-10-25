const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { registroSchema } = require('../alumnos/validators');
const { cambioPasswordSchema } = require('./validators');

const router = express.Router();

router.post('/login', controller.login);
router.post('/refresh', authenticate, controller.refresh);

// Auto-registro del alumno (público). Responde igual que el login: { token, user }
router.post('/registro', validate({ body: registroSchema }), controller.registro);

router.get('/me', authenticate, controller.me);
router.patch('/password', authenticate, validate({ body: cambioPasswordSchema }), controller.cambiarPassword);

module.exports = router;
