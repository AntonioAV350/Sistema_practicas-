const pool = require('../../config/db');

// Cuentas con sus roles y, si aplica, sus datos de ofertador o alumno
async function listar({ rol, q }) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.username, u.nombre, u.apellido_paterno, u.apellido_materno,
            u.email, u.telefono, u.activo, u.fecha_creacion,
            COALESCE(json_agg(json_build_object('rol', r.clave, 'subrol', s.clave))
                     FILTER (WHERE r.id_rol IS NOT NULL), '[]'::json) AS roles,
            o.tipo AS tipo_ofertador, o.id_empresa, o.puesto, e.nombre AS empresa,
            a.matricula
       FROM core.usuarios u
       LEFT JOIN core.usuario_roles ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN core.roles r ON r.id_rol = ur.id_rol
       LEFT JOIN core.subroles s ON s.id_subrol = ur.id_subrol
       LEFT JOIN practicas.ofertadores o ON o.id_usuario = u.id_usuario
       LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa
       LEFT JOIN core.alumnos a ON a.id_usuario = u.id_usuario
      WHERE ($1::text IS NULL OR EXISTS (
               SELECT 1 FROM core.usuario_roles ur2 JOIN core.roles r2 ON r2.id_rol = ur2.id_rol
                WHERE ur2.id_usuario = u.id_usuario AND r2.clave = $1))
        AND ($2::text IS NULL
             OR (u.nombre || ' ' || u.apellido_paterno || ' ' || COALESCE(u.apellido_materno, '')) ILIKE '%' || $2 || '%'
             OR u.email ILIKE '%' || $2 || '%')
      GROUP BY u.id_usuario, o.id_ofertador, e.id_empresa, a.id_alumno
      ORDER BY u.apellido_paterno, u.nombre`,
    [rol || null, q || null],
  );
  return rows;
}

async function clavesDeRoles(idUsuario, db = pool) {
  const { rows } = await db.query(
    `SELECT r.clave FROM core.usuario_roles ur JOIN core.roles r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = $1`,
    [idUsuario],
  );
  return rows.map((r) => r.clave);
}

async function cambiarSubrolAdmin(idUsuario, subrol, db = pool) {
  await db.query(
    `UPDATE core.usuario_roles ur
        SET id_subrol = s.id_subrol
       FROM core.subroles s, core.roles r
      WHERE ur.id_usuario = $1 AND r.clave = 'ADMIN' AND ur.id_rol = r.id_rol
        AND s.clave = $2 AND s.id_rol = r.id_rol`,
    [idUsuario, subrol],
  );
}

async function setActivo(idUsuario, activo) {
  const { rowCount } = await pool.query('UPDATE core.usuarios SET activo = $2 WHERE id_usuario = $1', [idUsuario, activo]);
  return rowCount > 0;
}

// --- Empresas ---

async function listarEmpresas() {
  const { rows } = await pool.query(
    `SELECT e.*, (SELECT count(*) FROM practicas.ofertadores o WHERE o.id_empresa = e.id_empresa) AS ofertadores
       FROM practicas.empresas e ORDER BY e.nombre`,
  );
  return rows;
}

async function empresa(idEmpresa, db = pool) {
  const { rows } = await db.query('SELECT * FROM practicas.empresas WHERE id_empresa = $1', [idEmpresa]);
  return rows[0] || null;
}

const COLUMNAS_EMPRESA = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  direccion: 'direccion',
  telefono: 'telefono',
  correo: 'correo',
  contactoNombre: 'contacto_nombre',
  contactoPuesto: 'contacto_puesto',
  activa: 'activa',
};

async function crearEmpresa(datos) {
  const columnas = Object.keys(COLUMNAS_EMPRESA).filter((k) => datos[k] !== undefined);
  const { rows } = await pool.query(
    `INSERT INTO practicas.empresas (${columnas.map((k) => COLUMNAS_EMPRESA[k]).join(', ')})
     VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    columnas.map((k) => datos[k]),
  );
  return rows[0];
}

async function actualizarEmpresa(idEmpresa, datos) {
  const columnas = Object.keys(COLUMNAS_EMPRESA).filter((k) => datos[k] !== undefined);
  if (!columnas.length) return empresa(idEmpresa);
  const { rows } = await pool.query(
    `UPDATE practicas.empresas SET ${columnas.map((k, i) => `${COLUMNAS_EMPRESA[k]} = $${i + 2}`).join(', ')}
      WHERE id_empresa = $1 RETURNING *`,
    [idEmpresa, ...columnas.map((k) => datos[k])],
  );
  return rows[0] || null;
}

module.exports = {
  listar, clavesDeRoles, cambiarSubrolAdmin, setActivo,
  listarEmpresas, empresa, crearEmpresa, actualizarEmpresa,
};
