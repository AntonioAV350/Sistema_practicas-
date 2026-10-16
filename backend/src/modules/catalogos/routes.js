const express = require('express');
const authenticate = require('../../middlewares/auth');
const controller = require('./controller');

const router = express.Router();

// Pública: la usa el formulario de registro del alumno
router.get('/carreras', controller.carreras);

router.get('/tipos-practica', authenticate, controller.tiposPractica);
router.get('/categorias-incidencia', authenticate, controller.categoriasIncidencia);

module.exports = router;
