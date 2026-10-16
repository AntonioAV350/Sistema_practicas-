const express = require('express');
const authenticate = require('../../middlewares/auth');
const requireRole = require('../../middlewares/roles');
const validate = require('../../middlewares/validate');
const controller = require('./controller');
const v = require('./validators');

const router = express.Router();
router.use(authenticate);

// La lista de empresas también la necesitan los admins para filtrar
router.get('/empresas', requireRole('ADMIN'), controller.listarEmpresas);

router.use(requireRole('SUPERADMIN'));

router.post('/empresas', validate({ body: v.empresaSchema }), controller.crearEmpresa);
router.patch('/empresas/:id', validate({ params: v.idParam, body: v.empresaParcialSchema }), controller.actualizarEmpresa);

router.get('/', validate({ query: v.listarQuery }), controller.listar);
router.post('/admins', validate({ body: v.crearAdminSchema }), controller.crearAdmin);
router.post('/ofertadores', validate({ body: v.crearOfertadorSchema }), controller.crearOfertador);
router.patch('/:id', validate({ params: v.idParam, body: v.actualizarSchema }), controller.actualizar);
router.patch('/:id/activo', validate({ params: v.idParam, body: v.activoSchema }), controller.cambiarActivo);
router.patch('/:id/password', validate({ params: v.idParam, body: v.passwordSchema }), controller.restablecerPassword);

module.exports = router;
