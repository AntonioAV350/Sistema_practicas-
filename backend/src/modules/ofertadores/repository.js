const pool = require('../../config/db');

const PERFIL = `
  SELECT o.id_ofertador, o.tipo, o.puesto, o.id_empresa, o.registrado_en,
         e.nombre AS empresa, e.direccion AS empresa_direccion, e.telefono AS empresa_telefono,
         e.correo AS empresa_correo,
         u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.telefono, u.activo
    FROM practicas.ofertadores o
    JOIN core.usuarios u ON u.id_usuario = o.id_usuario
    LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa`;

async function perfilPorUsuario(idUsuario, db = pool) {
  const { rows } = await db.query(`${PERFIL} WHERE o.id_usuario = $1`, [idUsuario]);
  return rows[0] || null;
}

async function crear({ idUsuario, tipo, idEmpresa, puesto, registradoPor }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO practicas.ofertadores (id_usuario, tipo, id_empresa, puesto, registrado_por)
     VALUES ($1, $2, $3, $4, $5) RETURNING id_ofertador`,
    [idUsuario, tipo, tipo === 'EXTERNO' ? idEmpresa : null, puesto ?? null, registradoPor],
  );
  return rows[0].id_ofertador;
}

async function actualizar(idUsuario, { tipo, idEmpresa, puesto }, db = pool) {
  await db.query(
    `UPDATE practicas.ofertadores
        SET tipo = COALESCE($2, tipo),
            id_empresa = CASE WHEN COALESCE($2, tipo) = 'INTERNO' THEN NULL ELSE COALESCE($3, id_empresa) END,
            puesto = COALESCE($4, puesto)
      WHERE id_usuario = $1`,
    [idUsuario, tipo ?? null, idEmpresa ?? null, puesto ?? null],
  );
}

// Para administración: ofertadores con cuántas vacantes abiertas y practicantes activos tienen
async function listar() {
  const { rows } = await pool.query(
    `SELECT o.id_ofertador, o.tipo, o.puesto, e.nombre AS empresa,
            u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.activo,
            (SELECT count(*) FROM practicas.vacantes v
              WHERE v.id_ofertador = o.id_ofertador AND v.estado = 'ABIERTA') AS vacantes_abiertas,
            (SELECT count(*) FROM practicas.practica_alumno pa
               JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
              WHERE v.id_ofertador = o.id_ofertador AND pa.estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) AS practicantes
       FROM practicas.ofertadores o
       JOIN core.usuarios u ON u.id_usuario = o.id_usuario
       LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa
      ORDER BY u.apellido_paterno, u.nombre`,
  );
  return rows;
}

// Pendientes del ofertador para su tablero
async function resumen(idUsuario) {
  const { rows } = await pool.query(
    `WITH mias AS (
       SELECT v.id_vacante, v.estado FROM practicas.vacantes v
         JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
        WHERE o.id_usuario = $1),
     practicas_mias AS (
       SELECT pa.id_practica, pa.estado FROM practicas.practica_alumno pa
        WHERE pa.id_vacante IN (SELECT id_vacante FROM mias))
     SELECT
       (SELECT count(*) FROM mias WHERE estado = 'ABIERTA') AS vacantes_abiertas,
       (SELECT count(*) FROM practicas.postulaciones p
         WHERE p.id_vacante IN (SELECT id_vacante FROM mias) AND p.estado = 'POSTULADA') AS postulaciones_nuevas,
       (SELECT count(*) FROM practicas.aceptaciones a
          JOIN practicas.postulaciones p ON p.id_postulacion = a.id_postulacion
         WHERE p.id_vacante IN (SELECT id_vacante FROM mias) AND a.estado = 'PENDIENTE') AS aceptaciones_pendientes,
       (SELECT count(*) FROM practicas_mias WHERE estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) AS practicantes_activos,
       (SELECT count(*) FROM practicas.tareas t
         WHERE t.id_practica IN (SELECT id_practica FROM practicas_mias) AND t.estado = 'ENTREGADA') AS tareas_por_revisar,
       (SELECT count(*) FROM practicas.v_avance_practica av
         WHERE av.id_practica IN (SELECT id_practica FROM practicas_mias)
           AND av.estado = 'ACTIVA' AND av.dias_sin_registro >= 3) AS practicantes_sin_bitacora`,
    [idUsuario],
  );
  return rows[0];
}

module.exports = { perfilPorUsuario, crear, actualizar, listar, resumen };
