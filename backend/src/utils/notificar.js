// Notificaciones que la BD no manda sola (los triggers cubren el resto).
// Reciben el client de la transacción para que la notificación se guarde
// junto con el cambio que la provoca.

async function notificarUsuario(db, { idUsuario, tipo, titulo, mensaje = null, entidad = null, idEntidad = null }) {
  await db.query(
    `INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
     VALUES ($1, (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS'), $2, $3, $4, $5, $6)`,
    [idUsuario, tipo, titulo, mensaje, entidad, idEntidad],
  );
}

async function notificarRol(db, { rol, subrol = null, tipo, titulo, mensaje = null, entidad = null, idEntidad = null }) {
  await db.query('SELECT core.fn_notificar_rol($1, $2, $3, $4, $5, $6, $7)', [
    rol, subrol, tipo, titulo, mensaje, entidad, idEntidad,
  ]);
}

module.exports = { notificarUsuario, notificarRol };
