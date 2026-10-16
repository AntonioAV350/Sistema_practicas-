
const pool = require('../../config/db');
 
// Columnas que se devuelven siempre.
// password_hash solamente se devuelve en getUserByEmail()
// porque el login necesita comprobar la contraseña.
const COLUMNAS = `
  u.id_usuario,
  u.username,
  u.email,
  u.nombre,
  u.apellido_paterno,
  u.apellido_materno,
  u.telefono,
  u.activo,
  u.fecha_creacion
`;
 
// Roles y subroles del usuario.
const ROLES = `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'rol', r.clave,
          'subrol', s.clave
        )
      )
      FROM core.usuario_roles ur
      JOIN core.roles r
        ON r.id_rol = ur.id_rol
      LEFT JOIN core.subroles s
        ON s.id_subrol = ur.id_subrol
      WHERE ur.id_usuario = u.id_usuario
    ),
    '[]'::json
  ) AS roles
`;
 
// Lista blanca de campos que se pueden modificar.
// Evita insertar nombres de columnas directamente desde el usuario.
const EDITABLES = {
  username: 'username',
  email: 'email',
  passwordHash: 'password_hash',
  nombre: 'nombre',
  apellidoPaterno: 'apellido_paterno',
  apellidoMaterno: 'apellido_materno',
  telefono: 'telefono',
  activo: 'activo',
};
 
// Crear un usuario nuevo, devuelve el usuario creado con todos sus datos y roles.
async function createUser({
  username,
  email,
  passwordHash,
  nombre,
  apellidoPaterno,
  apellidoMaterno = null,
  telefono = null,
}, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO core.usuarios
        (
          username,
          email,
          password_hash,
          nombre,
          apellido_paterno,
          apellido_materno,
          telefono
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_usuario`,
    [
      username,
      email,
      passwordHash,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      telefono,
    ],
  );
 
  return getUserById(rows[0].id_usuario, db);
}

//capturar y obtener datos por email
 
async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}, u.password_hash,
     ${ROLES} FROM core.usuarios u WHERE lower(u.email) = lower($1)`, [email],
  );
 
  return rows[0] || null;
}
 
// capturar y obtener datos por id
 
async function getUserById(id, db = pool) {
  const { rows } = await db.query(
    ` SELECT ${COLUMNAS},
        ${ROLES} FROM core.usuarios u WHERE u.id_usuario = $1`,[id],
);
 
  return rows[0] || null;
}
// para actualizar un usuario, se pasan los campos a modificar en un objeto

async function updateUser(id, campos = {}, db = pool) {
  const sets = [];
  const valores = [];

  for (const [clave, columna] of Object.entries(EDITABLES)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }
  if (sets.length === 0) {
    return getUserById(id, db);
  }

  valores.push(id);

  const { rows } = await db.query(
    `UPDATE core.usuarios SET ${sets.join(', ')} WHERE id_usuario = $${valores.length} RETURNING id_usuario`,valores,
  );

  return rows[0]
    ? getUserById(rows[0].id_usuario, db)
    : null;
}

async function deactivateUser(id) {
  const { rows } = await pool.query(
    `UPDATE core.usuarios SET activo = FALSE WHERE id_usuario = $1 RETURNING id_usuario`, [id],
  );
 
  return rows[0]
    ? getUserById(rows[0].id_usuario)
    : null;
}
 
async function assignRole(idUsuario, claveRol, claveSubrol = null, asignadoPor = null, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO core.usuario_roles (id_usuario, id_rol, id_subrol, asignado_por)
     SELECT $1, r.id_rol, s.id_subrol, $4
     FROM core.roles r
     LEFT JOIN core.subroles s ON s.clave = $3 AND s.id_rol = r.id_rol
     WHERE r.clave = $2
       AND ($3::text IS NULL OR s.id_subrol IS NOT NULL)
     RETURNING id_usuario`,
    [idUsuario, claveRol, claveSubrol, asignadoPor],
  );
  if (!rows[0]) throw new Error(
    claveSubrol
      ? `El rol ${claveRol} con subrol ${claveSubrol} no existe`
      : `El rol ${claveRol} no existe`,
  );
  return getUserById(idUsuario, db);
}
 
module.exports = { createUser, getUserByEmail, getUserById, updateUser, deactivateUser, assignRole };
// --- Usados por registro, cambio de contraseña y cuentas ---

async function getPasswordHash(id) {
  const { rows } = await pool.query('SELECT password_hash FROM core.usuarios WHERE id_usuario = $1', [id]);
  return rows[0]?.password_hash ?? null;
}

async function emailEnUso(email, exceptoId = null, db = pool) {
  const { rows } = await db.query(
    'SELECT 1 FROM core.usuarios WHERE lower(email) = lower($1) AND ($2::bigint IS NULL OR id_usuario <> $2)',
    [email, exceptoId],
  );
  return rows.length > 0;
}

// username a partir de una base (parte local del correo o matrícula), sin repetir
async function usernameDisponible(base, db = pool) {
  const limpio = base.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'usuario';
  const { rows } = await db.query(
    `SELECT username FROM core.usuarios WHERE username = $1 OR username LIKE $1 || '.%'`,
    [limpio],
  );
  const usados = new Set(rows.map((r) => r.username));
  if (!usados.has(limpio)) return limpio;
  let n = 2;
  while (usados.has(`${limpio}.${n}`)) n += 1;
  return `${limpio}.${n}`;
}

async function setPassword(id, passwordHash, db = pool) {
  await db.query('UPDATE core.usuarios SET password_hash = $1 WHERE id_usuario = $2', [passwordHash, id]);
}

module.exports.getPasswordHash = getPasswordHash;
module.exports.emailEnUso = emailEnUso;
module.exports.usernameDisponible = usernameDisponible;
module.exports.setPassword = setPassword;
