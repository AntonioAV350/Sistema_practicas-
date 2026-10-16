const pool = require('../../config/db');

// ============================================================
// Vacantes
// ============================================================

const VACANTE = `
  SELECT v.id_vacante, v.id_ofertador, v.id_tipo_practica, v.titulo, v.descripcion, v.requisitos,
         v.modalidad_trabajo, v.cupo_total, v.cupo_disponible, v.estado, v.publicada_en, v.cierra_en,
         tp.clave AS tipo_practica_clave, tp.nombre AS tipo_practica, tp.horas_requeridas,
         o.id_usuario AS id_usuario_ofertador, o.tipo AS tipo_ofertador,
         COALESCE(e.nombre, 'Universidad Autónoma de Chiapas') AS empresa, e.direccion AS empresa_direccion,
         uo.nombre AS ofertador_nombre, uo.apellido_paterno AS ofertador_apellido
    FROM practicas.vacantes v
    JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
    JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
    JOIN core.usuarios uo ON uo.id_usuario = o.id_usuario
    LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa`;

async function obtener(idVacante, db = pool) {
  const { rows } = await db.query(`${VACANTE} WHERE v.id_vacante = $1`, [idVacante]);
  return rows[0] || null;
}

async function crear(idOfertador, d) {
  const { rows } = await pool.query(
    `INSERT INTO practicas.vacantes
       (id_ofertador, id_tipo_practica, titulo, descripcion, requisitos, modalidad_trabajo, cupo_total, cupo_disponible, cierra_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8) RETURNING id_vacante`,
    [idOfertador, d.idTipoPractica, d.titulo, d.descripcion, d.requisitos, d.modalidadTrabajo, d.cupoTotal, d.cierraEn],
  );
  return rows[0].id_vacante;
}

// Si cambia el cupo total, el disponible se mueve lo mismo (los lugares ocupados se respetan)
async function actualizar(idVacante, d) {
  await pool.query(
    `UPDATE practicas.vacantes SET
        id_tipo_practica = COALESCE($2, id_tipo_practica),
        titulo = COALESCE($3, titulo),
        descripcion = COALESCE($4, descripcion),
        requisitos = CASE WHEN $9 THEN $5 ELSE requisitos END,
        modalidad_trabajo = CASE WHEN $10 THEN $6 ELSE modalidad_trabajo END,
        cupo_disponible = cupo_disponible + (COALESCE($7, cupo_total) - cupo_total),
        cupo_total = COALESCE($7, cupo_total),
        cierra_en = CASE WHEN $11 THEN $8 ELSE cierra_en END
      WHERE id_vacante = $1`,
    [
      idVacante, d.idTipoPractica ?? null, d.titulo ?? null, d.descripcion ?? null,
      d.requisitos ?? null, d.modalidadTrabajo ?? null, d.cupoTotal ?? null, d.cierraEn ?? null,
      d.requisitos !== undefined, d.modalidadTrabajo !== undefined, d.cierraEn !== undefined,
    ],
  );
}

async function cambiarEstado(idVacante, estado, db = pool) {
  await db.query('UPDATE practicas.vacantes SET estado = $2 WHERE id_vacante = $1', [idVacante, estado]);
}

async function listarDeOfertador(idOfertador) {
  const { rows } = await pool.query(
    `${VACANTE.replace(
      'FROM practicas.vacantes v',
      `, (SELECT count(*) FROM practicas.postulaciones p WHERE p.id_vacante = v.id_vacante AND p.estado = 'POSTULADA') AS postulaciones_nuevas,
         (SELECT count(*) FROM practicas.postulaciones p WHERE p.id_vacante = v.id_vacante) AS postulaciones_total,
         (SELECT count(*) FROM practicas.practica_alumno pa WHERE pa.id_vacante = v.id_vacante) AS practicantes
       FROM practicas.vacantes v`,
    )}
      WHERE v.id_ofertador = $1
      ORDER BY (v.estado = 'ABIERTA') DESC, v.publicada_en DESC`,
    [idOfertador],
  );
  return rows;
}

// Vacantes que puede ver el alumno, con el estado de su postulación si ya se postuló
async function listarAbiertas(idAlumno, { q, idTipoPractica, modalidad }) {
  const { rows } = await pool.query(
    `${VACANTE.replace(
      'FROM practicas.vacantes v',
      ', mp.id_postulacion AS mi_postulacion, mp.estado AS mi_postulacion_estado FROM practicas.vacantes v',
    )}
      JOIN practicas.v_vacantes_abiertas va ON va.id_vacante = v.id_vacante
      LEFT JOIN practicas.postulaciones mp ON mp.id_vacante = v.id_vacante AND mp.id_alumno = $1
      WHERE ($2::text IS NULL OR v.titulo ILIKE '%' || $2 || '%' OR v.descripcion ILIKE '%' || $2 || '%'
             OR e.nombre ILIKE '%' || $2 || '%')
        AND ($3::int IS NULL OR v.id_tipo_practica = $3)
        AND ($4::text IS NULL OR v.modalidad_trabajo = $4)
      ORDER BY v.publicada_en DESC`,
    [idAlumno, q || null, idTipoPractica || null, modalidad || null],
  );
  return rows;
}

async function listarTodas({ estado, q }) {
  const { rows } = await pool.query(
    `${VACANTE.replace(
      'FROM practicas.vacantes v',
      `, (SELECT count(*) FROM practicas.postulaciones p WHERE p.id_vacante = v.id_vacante) AS postulaciones_total,
         (SELECT count(*) FROM practicas.practica_alumno pa WHERE pa.id_vacante = v.id_vacante) AS practicantes
       FROM practicas.vacantes v`,
    )}
      WHERE ($1::text IS NULL OR v.estado = $1)
        AND ($2::text IS NULL OR v.titulo ILIKE '%' || $2 || '%' OR e.nombre ILIKE '%' || $2 || '%')
      ORDER BY v.publicada_en DESC`,
    [estado || null, q || null],
  );
  return rows;
}

async function tipoPracticaExiste(idTipoPractica) {
  const { rows } = await pool.query(
    'SELECT 1 FROM practicas.tipos_practica WHERE id_tipo_practica = $1 AND activo',
    [idTipoPractica],
  );
  return rows.length > 0;
}

// ============================================================
// Postulaciones
// ============================================================

const POSTULACION = `
  SELECT p.id_postulacion, p.id_vacante, p.id_alumno, p.postulada_en, p.estado,
         v.titulo, v.estado AS estado_vacante, v.cupo_disponible, o.id_usuario AS id_usuario_ofertador,
         al.id_usuario AS id_usuario_alumno,
         a.id_aceptacion, a.estado AS estado_aceptacion, a.aceptada_en, a.expira_en, a.resuelta_en
    FROM practicas.postulaciones p
    JOIN practicas.vacantes v ON v.id_vacante = p.id_vacante
    JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
    JOIN core.alumnos al ON al.id_alumno = p.id_alumno
    LEFT JOIN practicas.aceptaciones a ON a.id_postulacion = p.id_postulacion`;

async function obtenerPostulacion(idPostulacion, db = pool) {
  const { rows } = await db.query(`${POSTULACION} WHERE p.id_postulacion = $1`, [idPostulacion]);
  return rows[0] || null;
}

async function obtenerPorAceptacion(idAceptacion, db = pool) {
  const { rows } = await db.query(`${POSTULACION} WHERE a.id_aceptacion = $1`, [idAceptacion]);
  return rows[0] || null;
}

async function crearPostulacion(idVacante, idAlumno) {
  const { rows } = await pool.query(
    'INSERT INTO practicas.postulaciones (id_vacante, id_alumno) VALUES ($1, $2) RETURNING id_postulacion',
    [idVacante, idAlumno],
  );
  return rows[0].id_postulacion;
}

async function cambiarEstadoPostulacion(idPostulacion, estado, db = pool) {
  await db.query('UPDATE practicas.postulaciones SET estado = $2 WHERE id_postulacion = $1', [idPostulacion, estado]);
}

// Postulantes de una vacante con sus datos académicos y su carta aprobada
async function postulantesDeVacante(idVacante) {
  const { rows } = await pool.query(
    `SELECT p.id_postulacion, p.postulada_en, p.estado,
            al.id_alumno, al.matricula, al.grupo, c.nombre_carrera,
            u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.telefono,
            ins.numero_periodo,
            ca.id_carta AS id_carta_aprobada,
            a.id_aceptacion, a.estado AS estado_aceptacion, a.expira_en,
            pa.id_practica
       FROM practicas.postulaciones p
       JOIN core.alumnos al ON al.id_alumno = p.id_alumno
       JOIN core.usuarios u ON u.id_usuario = al.id_usuario
       JOIN core.carreras c ON c.id_carrera = al.id_carrera
       LEFT JOIN core.ciclos_escolares ce
              ON ce.id_tipo_periodo = c.id_tipo_periodo AND current_date BETWEEN ce.fecha_inicio AND ce.fecha_fin
       LEFT JOIN core.alumno_inscripciones ins ON ins.id_alumno = al.id_alumno AND ins.id_ciclo = ce.id_ciclo
       LEFT JOIN practicas.cartas_presentacion ca ON ca.id_alumno = al.id_alumno AND ca.estado = 'APROBADA'
       LEFT JOIN practicas.aceptaciones a ON a.id_postulacion = p.id_postulacion
       LEFT JOIN practicas.practica_alumno pa ON pa.id_aceptacion = a.id_aceptacion
      WHERE p.id_vacante = $1
      ORDER BY (p.estado = 'POSTULADA') DESC, p.postulada_en`,
    [idVacante],
  );
  return rows;
}

async function postulacionesDeAlumno(idAlumno) {
  const { rows } = await pool.query(
    `SELECT p.id_postulacion, p.id_vacante, p.postulada_en, p.estado,
            v.titulo, v.estado AS estado_vacante, v.modalidad_trabajo, tp.nombre AS tipo_practica,
            COALESCE(e.nombre, 'Universidad Autónoma de Chiapas') AS empresa,
            a.id_aceptacion, a.estado AS estado_aceptacion, a.aceptada_en, a.expira_en,
            pa.id_practica
       FROM practicas.postulaciones p
       JOIN practicas.vacantes v ON v.id_vacante = p.id_vacante
       JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
       JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
       LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa
       LEFT JOIN practicas.aceptaciones a ON a.id_postulacion = p.id_postulacion
       LEFT JOIN practicas.practica_alumno pa ON pa.id_aceptacion = a.id_aceptacion
      WHERE p.id_alumno = $1
      ORDER BY (a.estado = 'PENDIENTE') DESC NULLS LAST, p.postulada_en DESC`,
    [idAlumno],
  );
  return rows;
}

// Al confirmar una práctica, las demás postulaciones vivas del alumno se cierran
async function cerrarOtrasPostulaciones(idAlumno, idPostulacionConfirmada, db) {
  await db.query(
    `UPDATE practicas.postulaciones SET estado = 'CERRADA_POR_CONFIRMACION'
      WHERE id_alumno = $1 AND id_postulacion <> $2 AND estado IN ('POSTULADA', 'ACEPTADA')`,
    [idAlumno, idPostulacionConfirmada],
  );
}

// Al cancelar una vacante: postulaciones abiertas y aceptaciones pendientes se cierran.
// Devuelve a quién avisar.
async function cerrarPorCancelacion(idVacante, db) {
  const { rows: aceptaciones } = await db.query(
    `UPDATE practicas.aceptaciones a SET estado = 'CANCELADA_OFERTADOR'
       FROM practicas.postulaciones p
      WHERE p.id_postulacion = a.id_postulacion AND p.id_vacante = $1 AND a.estado = 'PENDIENTE'
      RETURNING p.id_postulacion`,
    [idVacante],
  );
  const { rows } = await db.query(
    `UPDATE practicas.postulaciones p SET estado = 'NO_SELECCIONADA'
       FROM core.alumnos al
      WHERE al.id_alumno = p.id_alumno AND p.id_vacante = $1
        AND (p.estado = 'POSTULADA' OR p.id_postulacion = ANY($2::bigint[]))
      RETURNING al.id_usuario`,
    [idVacante, aceptaciones.map((a) => a.id_postulacion)],
  );
  return rows.map((r) => r.id_usuario);
}

// ============================================================
// Aceptaciones
// ============================================================

async function crearAceptacion(idPostulacion, aceptadaPor, db) {
  const { rows } = await db.query(
    'INSERT INTO practicas.aceptaciones (id_postulacion, aceptada_por) VALUES ($1, $2) RETURNING id_aceptacion',
    [idPostulacion, aceptadaPor],
  );
  return rows[0].id_aceptacion;
}

async function cambiarEstadoAceptacion(idAceptacion, estado, db) {
  await db.query('UPDATE practicas.aceptaciones SET estado = $2 WHERE id_aceptacion = $1', [idAceptacion, estado]);
}

async function confirmarAceptacion(idAceptacion, idUsuarioAlumno, db) {
  const { rows } = await db.query('SELECT practicas.sp_confirmar_aceptacion($1, $2) AS id_practica', [
    idAceptacion, idUsuarioAlumno,
  ]);
  return rows[0].id_practica;
}

// Para saber si el alumno ya puede postularse (carta aprobada y sin práctica viva)
async function puedePostular(idAlumno) {
  const { rows } = await pool.query(
    `SELECT practicas.fn_alumno_puede_postular($1) AS puede,
            EXISTS (SELECT 1 FROM practicas.cartas_presentacion WHERE id_alumno = $1 AND estado = 'APROBADA') AS carta_aprobada,
            EXISTS (SELECT 1 FROM practicas.practica_alumno
                     WHERE id_alumno = $1 AND estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) AS practica_viva`,
    [idAlumno],
  );
  return rows[0];
}

module.exports = {
  obtener, crear, actualizar, cambiarEstado, listarDeOfertador, listarAbiertas, listarTodas, tipoPracticaExiste,
  obtenerPostulacion, obtenerPorAceptacion, crearPostulacion, cambiarEstadoPostulacion, postulantesDeVacante,
  postulacionesDeAlumno, cerrarOtrasPostulaciones, cerrarPorCancelacion,
  crearAceptacion, cambiarEstadoAceptacion, confirmarAceptacion, puedePostular,
};
