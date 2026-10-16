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

// Alta del alumno + sesión iniciada (el registro lo hace el módulo alumnos)
async function registro(datos) {
  const alumnos = require('../alumnos/service');
  const user = await alumnos.registrar(datos);
  return { token: generateToken(user), user: toPublicUser(user) };
}

async function me(userId) {
  const user = await repository.getUserById(userId);
  if (!user || !user.activo) throw new AuthError(401, 'TOKEN_INVALID', 'La sesión ya no es válida');
  return toPublicUser(user);
}

async function cambiarPassword(userId, actual, nueva) {
  const hash = await repository.getPasswordHash(userId);
  if (!hash || !(await bcrypt.compare(actual, hash))) {
    throw new AuthError(400, 'PASSWORD_INCORRECTA', 'La contraseña actual no es correcta');
  }
  await repository.setPassword(userId, await bcrypt.hash(nueva, 10));
}

module.exports = { login, refresh, registro, me, cambiarPassword, AuthError };
