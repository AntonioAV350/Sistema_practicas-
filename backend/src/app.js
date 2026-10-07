const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/routes');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);

module.exports = app;
