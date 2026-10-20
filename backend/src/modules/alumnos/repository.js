const pool = require('../../config/db');

// Perfil del alumno con su carrera y su inscripción en el ciclo vigente
// (el ciclo vigente es el del tipo de periodo de su carrera que incluye hoy).
const PERFIL = `
  SELECT a.id_alumno, a.matricula, a.grupo, a.id_carrera,
         c.nombre_carrera, c.total_periodos, c.periodo_minimo_practicas,
         lower(tp.nombre) AS tipo_periodo,
         u.id_usuario, u.username, u.nombre, u.apellido_paterno, u.apellido_materno,
         u.email, u.telefono, u.activo,
         ce.id_ciclo, ce.clave AS ciclo_actual, ins.numero_periodo
    FROM core.alumnos a
    JOIN core.usuarios u ON u.id_usuario = a.id_usuario
    JOIN core.carreras c ON c.id_carrera = a.id_carrera
    JOIN core.tipos_periodo tp ON tp.id_tipo_periodo = c.id_tipo_periodo
    LEFT JOIN core.ciclos_escolares ce
           ON ce.id_tipo_periodo = c.id_tipo_periodo
          AND current_date BETWEEN ce.fecha_inicio AND ce.fecha_fin
    LEFT JOIN core.alumno_inscripciones ins
           ON ins.id_alumno = a.id_alumno AND ins.id_ciclo = ce.id_ciclo`;

async function perfilPorUsuario(idUsuario, db = pool) {
  const { rows } = await db.query(`${PERFIL} WHERE a.id_usuario = $1`, [idUsuario]);
  return rows[0] || null;
}

async function perfilPorId(idAlumno, db = pool) {
  const { rows } = await db.query(`${PERFIL} WHERE a.id_alumno = $1`, [idAlumno]);
  return rows[0] || null;
}

async function matriculaEnUso(matricula, exceptoId = null, db = pool) {
  const { rows } = await db.query(
    'SELECT 1 FROM core.alumnos WHERE upper(matricula) = upper($1) AND ($2::bigint IS NULL OR id_alumno <> $2)',
    [matricula, exceptoId],
  );
  return rows.length > 0;
}

async function carrera(idCarrera, db = pool) {
  const { rows } = await db.query(
    'SELECT id_carrera, id_tipo_periodo, total_periodos FROM core.carreras WHERE id_carrera = $1 AND activa',
    [idCarrera],
  );
  return rows[0] || null;
}

async function cicloVigente(idTipoPeriodo, db = pool) {
  const { rows } = await db.query(
    `SELECT id_ciclo FROM core.ciclos_escolares
      WHERE id_tipo_periodo = $1 AND current_date BETWEEN fecha_inicio AND fecha_fin`,
    [idTipoPeriodo],
  );
  return rows[0]?.id_ciclo ?? null;
}

async function crear({ idUsuario, matricula, idCarrera, grupo }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO core.alumnos (id_usuario, matricula, id_carrera, grupo)
     VALUES ($1, upper($2), $3, upper($4)) RETURNING id_alumno`,
    [idUsuario, matricula, idCarrera, grupo],
  );
  return rows[0].id_alumno;
}

async function actualizar(idAlumno, { matricula, idCarrera, grupo }, db = pool) {
  await db.query(
    `UPDATE core.alumnos
        SET matricula = COALESCE(upper($2), matricula),
            id_carrera = COALESCE($3, id_carrera),
            grupo = COALESCE(upper($4), grupo)
      WHERE id_alumno = $1`,
    [idAlumno, matricula ?? null, idCarrera ?? null, grupo ?? null],
  );
}

async function guardarInscripcion(idAlumno, idCiclo, numeroPeriodo, grupo, db = pool) {
  await db.query(
    `INSERT INTO core.alumno_inscripciones (id_alumno, id_ciclo, numero_periodo, grupo)
     VALUES ($1, $2, $3, upper($4))
     ON CONFLICT (id_alumno, id_ciclo)
     DO UPDATE SET numero_periodo = EXCLUDED.numero_periodo, grupo = EXCLUDED.grupo`,
    [idAlumno, idCiclo, numeroPeriodo, grupo ? grupo.slice(0, 10) : null],
  );
}

async function tieneCartas(idAlumno, db = pool) {
  const { rows } = await db.query('SELECT 1 FROM practicas.cartas_presentacion WHERE id_alumno = $1 LIMIT 1', [idAlumno]);
  return rows.length > 0;
}

// Lista para administración: datos + estado de su última carta y de su última práctica
async function listar({ q, idCarrera }) {
  const { rows } = await pool.query(
    `SELECT a.id_alumno, a.matricula, a.grupo, c.nombre_carrera,
            u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.activo,
            ins.numero_periodo, lower(tp.nombre) AS tipo_periodo,
            carta.estado AS estado_carta,
            pr.id_practica, pr.estado AS estado_practica
       FROM core.alumnos a
       JOIN core.usuarios u ON u.id_usuario = a.id_usuario
       JOIN core.carreras c ON c.id_carrera = a.id_carrera
       JOIN core.tipos_periodo tp ON tp.id_tipo_periodo = c.id_tipo_periodo
       LEFT JOIN core.ciclos_escolares ce
              ON ce.id_tipo_periodo = c.id_tipo_periodo AND current_date BETWEEN ce.fecha_inicio AND ce.fecha_fin
       LEFT JOIN core.alumno_inscripciones ins ON ins.id_alumno = a.id_alumno AND ins.id_ciclo = ce.id_ciclo
       LEFT JOIN LATERAL (
            SELECT estado FROM practicas.cartas_presentacion cp
             WHERE cp.id_alumno = a.id_alumno ORDER BY cp.generada_en DESC LIMIT 1) carta ON TRUE
       LEFT JOIN LATERAL (
            SELECT id_practica, estado FROM practicas.practica_alumno p
             WHERE p.id_alumno = a.id_alumno ORDER BY p.fecha_inicio DESC, p.id_practica DESC LIMIT 1) pr ON TRUE
      WHERE ($1::text IS NULL OR a.matricula ILIKE '%' || $1 || '%'
             OR (u.nombre || ' ' || u.apellido_paterno || ' ' || COALESCE(u.apellido_materno, '')) ILIKE '%' || $1 || '%'
             OR u.email ILIKE '%' || $1 || '%')
        AND ($2::int IS NULL OR a.id_carrera = $2)
      ORDER BY u.apellido_paterno, u.nombre`,
    [q || null, idCarrera || null],
  );
  return rows;
}

// Historial para el detalle que ve administración
async function historial(idAlumno) {
  const [cartas, postulaciones, practicas] = await Promise.all([
    pool.query(
      `SELECT id_carta, estado, generada_en, escaneo_subido_en, revisada_en, comentarios
         FROM practicas.cartas_presentacion WHERE id_alumno = $1 ORDER BY generada_en DESC`,
      [idAlumno],
    ),
    pool.query(
      `SELECT p.id_postulacion, p.estado, p.postulada_en, v.titulo, a.estado AS estado_aceptacion
         FROM practicas.postulaciones p
         JOIN practicas.vacantes v ON v.id_vacante = p.id_vacante
         LEFT JOIN practicas.aceptaciones a ON a.id_postulacion = p.id_postulacion
        WHERE p.id_alumno = $1 ORDER BY p.postulada_en DESC`,
      [idAlumno],
    ),
    pool.query(
      `SELECT pa.id_practica, pa.estado, pa.fecha_inicio, pa.fecha_fin, v.titulo,
              av.horas_acumuladas, av.horas_requeridas
         FROM practicas.practica_alumno pa
         JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
         JOIN practicas.v_avance_practica av ON av.id_practica = pa.id_practica
        WHERE pa.id_alumno = $1 ORDER BY pa.fecha_inicio DESC`,
      [idAlumno],
    ),
  ]);
  return { cartas: cartas.rows, postulaciones: postulaciones.rows, practicas: practicas.rows };
}

module.exports = {
  perfilPorUsuario, perfilPorId, matriculaEnUso, carrera, cicloVigente, crear, actualizar,
  guardarInscripcion, tieneCartas, listar, historial,
};
