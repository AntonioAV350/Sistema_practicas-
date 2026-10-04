const express = require('express');
const controller = require('./controller');
const authenticate = require('../../middlewares/auth');

const router = express.Router();

router.post('/login', controller.login);
router.post('/refresh', authenticate, controller.refresh);

module.exports = router;
