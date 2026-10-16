const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const { subirArchivo } = require('../../utils/archivos');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

const id = validate({ params: v.idParam });

// Listas
router.get('/mias', requireRole('ESTUDIANTE'), controller.mias);
router.get('/ofertador', requireRole('OFERTADOR'), validate({ query: v.ofertadorQuery }), controller.deOfertador);
router.get('/resumen', requireRole('ADMIN'), controller.resumen);
router.get('/', requireRole('ADMIN'), validate({ query: v.listarQuery }), controller.listar);

// Tareas y evidencias (el servicio valida que sean de la práctica correcta)
router.post('/tareas/:id/evidencias', requireRole('ESTUDIANTE'), id, subirArchivo('evidencias'), controller.entregarEvidencia);
router.patch(
  '/tareas/:id/revision',
  requireRole('OFERTADOR'),
  validate({ params: v.idParam, body: v.revisionTareaSchema }),
  controller.revisarTarea,
);
router.get('/evidencias/:id', id, controller.evidencia);

// Una práctica (alumno dueño, su ofertador o un admin)
router.get('/:id', id, controller.detalle);
router.get('/:id/tareas', id, controller.tareas);
router.post('/:id/tareas', requireRole('OFERTADOR'), validate({ params: v.idParam, body: v.tareaSchema }), controller.crearTarea);

// Cierre
router.post('/:id/solicitar-cierre', requireRole('ESTUDIANTE'), id, controller.solicitarCierre);
router.post('/:id/proyecto-completado', requireRole('OFERTADOR'), id, controller.proyectoCompletado);
router.post(
  '/:id/cierre',
  requireRole('ADMIN_ACADEMICO'),
  validate({ params: v.idParam, body: v.cierreSchema }),
  controller.resolverCierre,
);

// Carta de aceptación
router.post('/:id/carta-aceptacion', requireRole('OFERTADOR'), id, controller.generarCartaAceptacion);
router.get('/:id/carta-aceptacion/pdf', id, controller.pdfCartaAceptacion);

module.exports = router;
