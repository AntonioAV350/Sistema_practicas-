const pool = require('../../config/db');

async function carreras() {
  const { rows } = await pool.query(
    `SELECT c.id_carrera, c.nombre_carrera, c.total_periodos, c.periodo_minimo_practicas,
            tp.clave AS tipo_periodo, tp.nombre AS nombre_tipo_periodo
       FROM core.carreras c
       JOIN core.tipos_periodo tp ON tp.id_tipo_periodo = c.id_tipo_periodo
      WHERE c.activa
      ORDER BY c.nombre_carrera`,
  );
  return rows;
}

async function tiposPractica() {
  const { rows } = await pool.query(
    `SELECT id_tipo_practica, clave, nombre, descripcion, horas_requeridas
       FROM practicas.tipos_practica WHERE activo ORDER BY id_tipo_practica`,
  );
  return rows;
}

async function categoriasIncidencia() {
  const { rows } = await pool.query(
    `SELECT id_categoria, clave, nombre FROM practicas.categorias_incidencia WHERE activa ORDER BY nombre`,
  );
  return rows;
}

module.exports = { carreras, tiposPractica, categoriasIncidencia };
