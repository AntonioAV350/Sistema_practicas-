const pool = require('../../config/db');

async function listar(idPractica) {
  const { rows } = await pool.query(
    `SELECT b.id_registro, b.fecha, b.descripcion, b.horas, b.id_tarea, b.creado_en, t.titulo AS tarea
       FROM practicas.bitacora b
       LEFT JOIN practicas.tareas t ON t.id_tarea = b.id_tarea
      WHERE b.id_practica = $1
      ORDER BY b.fecha DESC, b.creado_en DESC`,
    [idPractica],
  );
  return rows;
}

async function horasDelDia(idPractica, fecha) {
  const { rows } = await pool.query(
    'SELECT COALESCE(SUM(horas), 0) AS horas FROM practicas.bitacora WHERE id_practica = $1 AND fecha = $2',
    [idPractica, fecha],
  );
  return rows[0].horas;
}

async function crear(idPractica, { fecha, horas, descripcion, idTarea }) {
  const { rows } = await pool.query(
    `INSERT INTO practicas.bitacora (id_practica, fecha, horas, descripcion, id_tarea)
     VALUES ($1, $2, $3, $4, $5) RETURNING id_registro`,
    [idPractica, fecha, horas, descripcion, idTarea ?? null],
  );
  return rows[0].id_registro;
}

async function obtener(idRegistro) {
  const { rows } = await pool.query('SELECT * FROM practicas.bitacora WHERE id_registro = $1', [idRegistro]);
  return rows[0] || null;
}

async function eliminar(idRegistro) {
  await pool.query('DELETE FROM practicas.bitacora WHERE id_registro = $1', [idRegistro]);
}

module.exports = { listar, horasDelDia, crear, obtener, eliminar };
