const multer = require('multer');
const { AppError } = require('../utils/AppError');

// Traduce errores de Postgres a respuestas legibles. Los RAISE EXCEPTION de los
// triggers (código P0001) ya traen un mensaje en español pensado para el usuario.
function desdePostgres(err) {
  switch (err.code) {
    case 'P0001':
      return [409, 'REGLA_NEGOCIO', err.message];
    case '23505':
      return [409, 'DUPLICADO', 'Ya existe un registro con esos datos'];
    case '23514':
      return [422, 'RESTRICCION', 'Los datos no cumplen una regla de la base de datos'];
    case '23503':
      return [422, 'REFERENCIA_INVALIDA', 'Uno de los datos hace referencia a algo que no existe'];
    case '22P02':
    case '22007':
    case '22008':
      return [400, 'VALIDATION_ERROR', 'Formato de dato inválido'];
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo (5 MB)' : 'Archivo inválido';
    return res.status(status).json({ error: 'ARCHIVO_INVALIDO', message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'JSON inválido' });
  }

  const pg = desdePostgres(err);
  if (pg) {
    const [status, code, message] = pg;
    if (status >= 422) console.warn(`[db] ${err.code} ${err.constraint || ''} ${err.detail || err.message}`);
    return res.status(status).json({ error: code, message });
  }

  console.error(err);
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

module.exports = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
