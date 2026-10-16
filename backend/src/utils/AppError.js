// Error de negocio con status HTTP y código estable para el frontend.
// El errorHandler lo convierte en { error: code, message, details? }.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, 'VALIDATION_ERROR', message, details);
const forbidden = (message = 'No tienes permiso para realizar esta acción') =>
  new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Recurso no encontrado') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);

module.exports = { AppError, badRequest, forbidden, notFound, conflict };
