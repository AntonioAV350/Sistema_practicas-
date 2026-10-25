const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// El frontend llama por el proxy de Vite (/api -> :3000), así que no hace falta CORS.
const MODULOS = [
  'auth', 'catalogos', 'cuentas', 'alumnos', 'ofertadores', 'vacantes',
  'cartas', 'practicas', 'bitacora', 'incidencias', 'bajas', 'notificaciones',
];
for (const modulo of MODULOS) {
  app.use(`/api/${modulo}`, require(`./modules/${modulo}/routes`));
}

app.get('/api/salud', (req, res) => res.json({ ok: true }));

app.use(errorHandler.notFoundHandler);
app.use(errorHandler);

module.exports = app;
