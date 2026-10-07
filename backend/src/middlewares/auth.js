const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwt');

// Valida el header "Authorization: Bearer <token>" y deja el payload en req.user.
// Uso: router.get('/ruta', authenticate, requireRole(...), controller)
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'TOKEN_MISSING',
      message: 'Se requiere un token de acceso',
    });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Tu sesión expiró, inicia sesión de nuevo',
      });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'TOKEN_INVALID',
        message: 'Token inválido',
      });
    }
    return next(err);
  }
}

module.exports = authenticate;
