const jwt = require('jsonwebtoken');

// Tiempo de vida por defecto: una jornada de trabajo.
const DEFAULT_EXPIRES_IN = '8h';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado en el .env');
  }
  return secret;
}

// Payload del token (contrato compartido con el middleware de roles y el frontend):
//   id     -> id_usuario
//   nombre -> nombre del usuario
//   roles  -> [{ rol: 'ADMIN', subrol: 'ADMIN_DOCUMENTAL' }, { rol: 'ESTUDIANTE', subrol: null }]
// Nunca se mete la contraseña ni datos sensibles.
function generateToken(user) {
  const payload = {
    id: user.id_usuario,
    nombre: user.nombre,
    roles: user.roles,
  };

  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
  });
}

// Lanza TokenExpiredError si ya venció o JsonWebTokenError si es inválido/manipulado.
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { generateToken, verifyToken };
