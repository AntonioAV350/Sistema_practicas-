const pool = require('../../config/db');

const BAJA = `
  SELECT b.id_solicitud, b.id_practica, b.id_incidencia, b.motivo, b.solicitada_en, b.estado,
         b.nota_academica, b.escalada_en, b.decidida_en, b.comentario_decision, b.resuelta_en,
         b.solicitada_por, us.nombre AS solicitada_por_nombre, us.apellido_paterno AS solicitada_por_apellido,
         uat.nombre AS atendida_por_nombre, uat.apellido_paterno AS atendida_por_apellido,
         ude.nombre AS decidida_por_nombre, ude.apellido_paterno AS decidida_por_apellido,
         pa.estado AS estado_practica, v.titulo,
         al.matricula, al.id_usuario AS id_usuario_alumno, ua.nombre, ua.apellido_paterno, ua.apellido_materno,
         COALESCE(e.nombre, 'Universidad Autónoma de Chiapas') AS empresa,
         i.descripcion AS incidencia_descripcion
    FROM practicas.solicitudes_baja b
    JOIN core.usuarios us ON us.id_usuario = b.solicitada_por
    LEFT JOIN core.usuarios uat ON uat.id_usuario = b.atendida_por
    LEFT JOIN core.usuarios ude ON ude.id_usuario = b.decidida_por
    JOIN practicas.practica_alumno pa ON pa.id_practica = b.id_practica
    JOIN core.alumnos al ON al.id_alumno = pa.id_alumno
    JOIN core.usuarios ua ON ua.id_usuario = al.id_usuario
    JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
    JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
    LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa
    LEFT JOIN practicas.incidencias i ON i.id_incidencia = b.id_incidencia`;

async function obtener(idSolicitud, db = pool) {
  const { rows } = await db.query(`${BAJA} WHERE b.id_solicitud = $1`, [idSolicitud]);
  return rows[0] || null;
}

async function listar({ estado, idPractica, idUsuarioOfertador }) {
  const { rows } = await pool.query(
    `${BAJA}
      WHERE ($1::text IS NULL OR b.estado = $1)
        AND ($2::bigint IS NULL OR b.id_practica = $2)
        AND ($3::bigint IS NULL OR o.id_usuario = $3)
      ORDER BY (b.estado IN ('EN_REVISION_ACADEMICA', 'ESCALADA')) DESC, b.solicitada_en DESC`,
    [estado || null, idPractica || null, idUsuarioOfertador || null],
  );
  return rows;
}

async function incidenciaDePractica(idIncidencia, idPractica) {
  const { rows } = await pool.query(
    'SELECT 1 FROM practicas.incidencias WHERE id_incidencia = $1 AND id_practica = $2',
    [idIncidencia, idPractica],
  );
  return rows.length > 0;
}

async function crear(idPractica, idUsuario, { idIncidencia, motivo }) {
  const { rows } = await pool.query(
    `INSERT INTO practicas.solicitudes_baja (id_practica, id_incidencia, solicitada_por, motivo)
     VALUES ($1, $2, $3, $4) RETURNING id_solicitud`,
    [idPractica, idIncidencia ?? null, idUsuario, motivo],
  );
  return rows[0].id_solicitud;
}

// Paso 2: el admin académico resuelve sin baja o escala al superadmin
async function atender(idSolicitud, estado, idAdmin, nota, db) {
  await db.query(
    `UPDATE practicas.solicitudes_baja SET estado = $2, atendida_por = $3, nota_academica = $4
      WHERE id_solicitud = $1`,
    [idSolicitud, estado, idAdmin, nota],
  );
}

// Paso 3: el superadmin decide (APROBADA deja la práctica en BAJA por trigger)
async function decidir(idSolicitud, estado, idSuperadmin, comentario, db) {
  await db.query(
    `UPDATE practicas.solicitudes_baja SET estado = $2, decidida_por = $3, comentario_decision = $4
      WHERE id_solicitud = $1`,
    [idSolicitud, estado, idSuperadmin, comentario],
  );
}

module.exports = { obtener, listar, incidenciaDePractica, crear, atender, decidir };
