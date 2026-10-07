const bcrypt = require('bcrypt');
const repository = require('./repository');
const { generateToken } = require('../../utils/jwt');

// Hash de relleno: si el correo no existe igual se ejecuta bcrypt.compare,
// así el tiempo de respuesta no delata qué correos están registrados.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function toPublicUser(user) {
  return {
    id: user.id_usuario,
    nombre: user.nombre,
    apellidoPaterno: user.apellido_paterno,
    apellidoMaterno: user.apellido_materno,
    email: user.email,
    roles: user.roles,
  };
}

async function login(email, password) {
  const user = await repository.getUserByEmail(email);
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new AuthError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
  }
  if (!user.activo) {
    throw new AuthError(403, 'ACCOUNT_INACTIVE', 'Tu cuenta está desactivada');
  }

  return { token: generateToken(user), user: toPublicUser(user) };
}

// Emite un token nuevo a partir de uno todavía válido.
// Se vuelve a leer el usuario para no renovar cuentas desactivadas o con roles viejos.
async function refresh(userId) {
  const user = await repository.getUserById(userId);

  if (!user || !user.activo) {
    throw new AuthError(401, 'TOKEN_INVALID', 'La sesión ya no es válida');
  }

  return { token: generateToken(user), user: toPublicUser(user) };
}

module.exports = { login, refresh, AuthError };
