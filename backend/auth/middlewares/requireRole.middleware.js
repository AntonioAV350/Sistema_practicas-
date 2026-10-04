// SIGEA-19 · Middleware requireRole
//
// Responde "¿qué tienes permitido hacer?". Va SIEMPRE después del middleware
// que verifica el token (SIGEA-17, authenticate), porque lee los roles de req.user.
//
// Uso:
//   const authenticate = require('../../middlewares/auth');
//   const requireRole = require('../../../auth/middlewares/requireRole.middleware');
//
//   router.post('/cuentas/admin', authenticate, requireRole('SUPERADMIN'), ctrl.crearAdmin);
//   router.get('/cuentas', authenticate, requireRole(['ADMIN', 'SUPERADMIN']), ctrl.listar);
//   router.patch('/cartas/:id', authenticate, requireRole('ADMIN_DOCUMENTAL'), ctrl.revisar);
//   // también acepta varios argumentos: requireRole('ADMIN', 'OFERTADOR')
//
//   // Opcional, para evitar errores de dedo:
//   const { ROLES, SUBROLES } = requireRole;
//   requireRole(ROLES.SUPERADMIN)
//
// Se pueden pedir roles (ESTUDIANTE, OFERTADOR, ADMIN, SUPERADMIN) o subroles
// (ADMIN_ACADEMICO, ADMIN_DOCUMENTAL). Basta con que el usuario cumpla UNO.
//   - Pedir ADMIN deja pasar a cualquier admin, sea académico o documental.
//   - Pedir ADMIN_DOCUMENTAL solo deja pasar al admin documental.
//   - SUPERADMIN pasa automáticamente donde se pida ADMIN o un subrol de ADMIN
//     (igual que core.fn_tiene_subrol), pero no en rutas solo de ESTUDIANTE/OFERTADOR.
//
// Forma de req.user (payload del token de SIGEA-16/17):
//   { id, nombre, roles: [{ rol: 'ADMIN', subrol: 'ADMIN_ACADEMICO' }, ...] }
// Por compatibilidad también acepta req.user.rol / req.user.subrol como strings.
//
// Respuestas:
//   401 -> no hay req.user (no pasó por la verificación de token).
//   403 -> sí inició sesión, pero su rol no está permitido.
//   next() -> permitido.

// Claves tal como están en core.roles / core.subroles (seed.sql)
const ROLES = Object.freeze({
  ESTUDIANTE: 'ESTUDIANTE',
  OFERTADOR: 'OFERTADOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
});

const SUBROLES = Object.freeze({
  ADMIN_ACADEMICO: 'ADMIN_ACADEMICO',
  ADMIN_DOCUMENTAL: 'ADMIN_DOCUMENTAL',
});

const CLAVES_VALIDAS = new Set([...Object.values(ROLES), ...Object.values(SUBROLES)]);

// El SUPERADMIN "tiene todo lo del Administrador"
const IMPLICITOS_SUPERADMIN = new Set([
  ROLES.ADMIN,
  SUBROLES.ADMIN_ACADEMICO,
  SUBROLES.ADMIN_DOCUMENTAL,
]);

// Saca todas las claves (roles y subroles) que tiene el usuario.
function clavesDelUsuario(user) {
  const claves = new Set();
  const lista = Array.isArray(user.roles) ? user.roles : [];

  for (const r of lista) {
    if (typeof r === 'string') {
      claves.add(r.toUpperCase());
    } else if (r && typeof r === 'object') {
      if (r.rol) claves.add(String(r.rol).toUpperCase());
      if (r.subrol) claves.add(String(r.subrol).toUpperCase());
    }
  }
  if (typeof user.rol === 'string') claves.add(user.rol.toUpperCase());
  if (typeof user.subrol === 'string') claves.add(user.subrol.toUpperCase());

  return claves;
}

function requireRole(...args) {
  // Acepta requireRole('A'), requireRole(['A','B']) o requireRole('A','B').
  const permitidos = args.flat().map((r) => String(r).trim().toUpperCase());

  // Falla al arrancar el servidor (no en cada petición) si alguien escribe mal un rol.
  if (permitidos.length === 0) {
    throw new Error('requireRole: hay que indicar al menos un rol');
  }
  const invalidos = permitidos.filter((r) => !CLAVES_VALIDAS.has(r));
  if (invalidos.length) {
    throw new Error(
      `requireRole: rol(es) desconocido(s): ${invalidos.join(', ')}. ` +
        `Válidos: ${[...CLAVES_VALIDAS].join(', ')}`,
    );
  }

  return function requireRoleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const delUsuario = clavesDelUsuario(req.user);
    const esSuperadmin = delUsuario.has(ROLES.SUPERADMIN);

    const permitido = permitidos.some(
      (r) => delUsuario.has(r) || (esSuperadmin && IMPLICITOS_SUPERADMIN.has(r)),
    );

    if (!permitido) {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción',
        requiere: permitidos,
      });
    }

    return next();
  };
}

module.exports = requireRole;
module.exports.ROLES = ROLES;
module.exports.SUBROLES = SUBROLES;
