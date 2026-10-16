const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

const alumno = requireRole('ESTUDIANTE');
const ofertador = requireRole('OFERTADOR');
const id = validate({ params: v.idParam });

// --- Rutas fijas primero (antes de /:id) ---
router.get('/', alumno, validate({ query: v.abiertasQuery }), controller.abiertas);
router.get('/elegibilidad', alumno, controller.elegibilidad);
router.get('/mias', ofertador, controller.misVacantes);
router.get('/todas', requireRole('ADMIN'), validate({ query: v.todasQuery }), controller.todas);
router.post('/', ofertador, validate({ body: v.vacanteSchema }), controller.crear);

// Postulaciones
router.get('/postulaciones/mias', alumno, controller.misPostulaciones);
router.patch('/postulaciones/:id/retirar', alumno, id, controller.retirar);
router.post('/postulaciones/:id/aceptar', ofertador, id, controller.aceptar);
router.patch('/postulaciones/:id/descartar', ofertador, id, controller.descartar);

// Aceptaciones (48 h para que el alumno confirme)
router.post('/aceptaciones/:id/confirmar', alumno, id, controller.confirmar);
router.patch('/aceptaciones/:id/rechazar', alumno, id, controller.rechazar);
router.patch('/aceptaciones/:id/cancelar', ofertador, id, controller.cancelar);

// --- Una vacante ---
router.get('/:id', id, controller.detalle);
router.patch('/:id', ofertador, validate({ params: v.idParam, body: v.vacanteParcialSchema }), controller.actualizar);
router.patch('/:id/estado', ofertador, validate({ params: v.idParam, body: v.estadoSchema }), controller.cambiarEstado);
router.get('/:id/postulaciones', requireRole('OFERTADOR', 'ADMIN'), id, controller.postulantes);
router.post('/:id/postulaciones', alumno, id, controller.postular);

module.exports = router;
