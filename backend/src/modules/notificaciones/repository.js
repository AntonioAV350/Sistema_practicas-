const pool = require('../../config/db');

async function listar(idUsuario, { soloNoLeidas = false, limite = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT id_notificacion, tipo, titulo, mensaje, entidad, id_entidad, leida, creada_en
       FROM core.notificaciones
      WHERE id_usuario = $1 AND ($2::boolean = FALSE OR leida = FALSE)
      ORDER BY creada_en DESC, id_notificacion DESC
      LIMIT $3`,
    [idUsuario, soloNoLeidas, limite],
  );
  return rows;
}

async function contarNoLeidas(idUsuario) {
  const { rows } = await pool.query(
    'SELECT count(*) AS no_leidas FROM core.notificaciones WHERE id_usuario = $1 AND leida = FALSE',
    [idUsuario],
  );
  return rows[0].no_leidas;
}

async function marcarLeida(idUsuario, idNotificacion) {
  const { rowCount } = await pool.query(
    'UPDATE core.notificaciones SET leida = TRUE WHERE id_notificacion = $1 AND id_usuario = $2',
    [idNotificacion, idUsuario],
  );
  return rowCount > 0;
}

async function marcarTodas(idUsuario) {
  const { rowCount } = await pool.query(
    'UPDATE core.notificaciones SET leida = TRUE WHERE id_usuario = $1 AND leida = FALSE',
    [idUsuario],
  );
  return rowCount;
}

module.exports = { listar, contarNoLeidas, marcarLeida, marcarTodas };
