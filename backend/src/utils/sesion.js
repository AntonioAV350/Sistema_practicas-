// Preguntas sobre el usuario del token (req.user = { id, nombre, roles: [{ rol, subrol }] }).
// Siguen la misma regla que requireRole: el SUPERADMIN cuenta como cualquier ADMIN.

const claves = (user) => new Set((user?.roles ?? []).flatMap((r) => [r.rol, r.subrol]).filter(Boolean));

const esSuperadmin = (user) => claves(user).has('SUPERADMIN');
const esAdmin = (user) => esSuperadmin(user) || claves(user).has('ADMIN');
const tieneSubrol = (user, subrol) => esSuperadmin(user) || claves(user).has(subrol);
const esAlumno = (user) => claves(user).has('ESTUDIANTE');
const esOfertador = (user) => claves(user).has('OFERTADOR');

module.exports = { esSuperadmin, esAdmin, tieneSubrol, esAlumno, esOfertador };
