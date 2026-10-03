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

// ============================================================
// CREATE
// ============================================================

async function createUser({
  username,
  email,
  passwordHash,
  nombre,
  apellidoPaterno,
  apellidoMaterno = null,
  telefono = null,
}) {
  const { rows } = await pool.query(
    `
      INSERT INTO core.usuarios
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
      RETURNING id_usuario
    `,
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

  return getUserById(rows[0].id_usuario);
}

// ============================================================
// READ: por email
// ============================================================

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `
      SELECT
        ${COLUMNAS},
        u.password_hash,
        ${ROLES}
      FROM core.usuarios u
      WHERE lower(u.email) = lower($1)
    `,
    [email],
  );

  return rows[0] || null;
}

// ============================================================
// READ: por ID
// ============================================================

async function getUserById(id) {
  const { rows } = await pool.query(
    `
      SELECT
        ${COLUMNAS},
        ${ROLES}
      FROM core.usuarios u
      WHERE u.id_usuario = $1
    `,
    [id],
  );

  return rows[0] || null;
}

// ============================================================
// UPDATE
// ============================================================

async function updateUser(id, campos = {}) {
  const sets = [];
  const valores = [];

  for (const [clave, columna] of Object.entries(EDITABLES)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }

  // Si no mandaron campos para modificar,
  // simplemente devolvemos el usuario actual.
  if (sets.length === 0) {
    return getUserById(id);
  }

  valores.push(id);

  const { rows } = await pool.query(
    `
      UPDATE core.usuarios
      SET ${sets.join(', ')}
      WHERE id_usuario = $${valores.length}
      RETURNING id_usuario
    `,
    valores,
  );

  return rows[0]
    ? getUserById(rows[0].id_usuario)
    : null;
}

// ============================================================
// DEACTIVATE
// ============================================================

async function deactivateUser(id) {
  const { rows } = await pool.query(
    `
      UPDATE core.usuarios
      SET activo = FALSE
      WHERE id_usuario = $1
      RETURNING id_usuario
    `,
    [id],
  );

  return rows[0]
    ? getUserById(rows[0].id_usuario)
    : null;
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deactivateUser,
};