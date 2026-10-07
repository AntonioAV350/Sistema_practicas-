
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
}) {
  const { rows } = await pool.query(
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
 
  return getUserById(rows[0].id_usuario);
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
 
async function getUserById(id) {
  const { rows } = await pool.query(
    ` SELECT ${COLUMNAS},
        ${ROLES} FROM core.usuarios u WHERE u.id_usuario = $1`,[id],
);
 
  return rows[0] || null;
}
// para actualizar un usuario, se pasan los campos a modificar en un objeto

async function updateUser(id, campos = {}) {
  const sets = [];
  const valores = [];
 
  for (const [clave, columna] of Object.entries(EDITABLES)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }
  if (sets.length === 0) {
    return getUserById(id);
  }
 
  valores.push(id);
 
  const { rows } = await pool.query(
    `UPDATE core.usuarios SET ${sets.join(', ')} WHERE id_usuario = $${valores.length} RETURNING id_usuario`,valores,
  );
 
  return rows[0]
    ? getUserById(rows[0].id_usuario)
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
 
async function assignRole(idUsuario, claveRol, claveSubrol = null, asignadoPor = null) {
  const { rows } = await pool.query(
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
  return getUserById(idUsuario);
}
 
module.exports = { createUser, getUserByEmail, getUserById, updateUser, deactivateUser, assignRole };