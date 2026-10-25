const pool = require('../../config/db');

const INCIDENCIA = `
  SELECT i.id_incidencia, i.id_practica, i.id_categoria, i.categoria_libre, i.descripcion, i.fecha_hecho,
         i.registrada_en, i.estado, i.resolucion, i.resuelta_en,
         COALESCE(ci.nombre, i.categoria_libre) AS categoria,
         i.reportada_por, ur.nombre AS reportada_por_nombre, ur.apellido_paterno AS reportada_por_apellido,
         ua2.nombre AS atendida_por_nombre, ua2.apellido_paterno AS atendida_por_apellido,
         pa.estado AS estado_practica, v.titulo,
         al.matricula, ua.nombre, ua.apellido_paterno, ua.apellido_materno,
         COALESCE(e.nombre, 'Universidad Autónoma de Chiapas') AS empresa,
         o.id_usuario AS id_usuario_ofertador
    FROM practicas.incidencias i
    LEFT JOIN practicas.categorias_incidencia ci ON ci.id_categoria = i.id_categoria
    JOIN core.usuarios ur ON ur.id_usuario = i.reportada_por
    LEFT JOIN core.usuarios ua2 ON ua2.id_usuario = i.atendida_por
    JOIN practicas.practica_alumno pa ON pa.id_practica = i.id_practica
    JOIN core.alumnos al ON al.id_alumno = pa.id_alumno
    JOIN core.usuarios ua ON ua.id_usuario = al.id_usuario
    JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
    JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
    LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa`;

async function obtener(idIncidencia, db = pool) {
  const { rows } = await db.query(`${INCIDENCIA} WHERE i.id_incidencia = $1`, [idIncidencia]);
  return rows[0] || null;
}

async function listar({ estado, idPractica, idUsuarioOfertador }) {
  const { rows } = await pool.query(
    `${INCIDENCIA}
      WHERE ($1::text IS NULL OR i.estado = $1)
        AND ($2::bigint IS NULL OR i.id_practica = $2)
        AND ($3::bigint IS NULL OR o.id_usuario = $3)
      ORDER BY (i.estado = 'ABIERTA') DESC, i.registrada_en DESC`,
    [estado || null, idPractica || null, idUsuarioOfertador || null],
  );
  return rows;
}

async function crear(idPractica, idUsuario, d) {
  const { rows } = await pool.query(
    `INSERT INTO practicas.incidencias (id_practica, reportada_por, id_categoria, categoria_libre, descripcion, fecha_hecho)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_incidencia`,
    [idPractica, idUsuario, d.idCategoria ?? null, d.categoriaLibre ?? null, d.descripcion, d.fechaHecho],
  );
  return rows[0].id_incidencia;
}

async function resolver(idIncidencia, idAdmin, resolucion, db) {
  await db.query(
    `UPDATE practicas.incidencias SET estado = 'RESUELTA', atendida_por = $2, resolucion = $3, resuelta_en = now()
      WHERE id_incidencia = $1`,
    [idIncidencia, idAdmin, resolucion],
  );
}

module.exports = { obtener, listar, crear, resolver };
