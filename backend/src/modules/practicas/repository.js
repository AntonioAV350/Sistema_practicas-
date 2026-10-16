const pool = require('../../config/db');

// Práctica con alumno, vacante, ofertador y avance (v_avance_practica)
const PRACTICA = `
  SELECT pa.id_practica, pa.id_aceptacion, pa.id_alumno, pa.id_vacante, pa.id_carta_presentacion,
         pa.estado, pa.fecha_inicio, pa.fecha_fin, pa.carta_compartida_en,
         pa.cierre_solicitado_en, pa.proyecto_completado_en, pa.cerrada_en, pa.observaciones_cierre,
         al.id_usuario AS id_usuario_alumno, al.matricula, al.grupo, car.nombre_carrera,
         ua.nombre, ua.apellido_paterno, ua.apellido_materno, ua.email, ua.telefono,
         v.titulo, v.modalidad_trabajo, tp.clave AS tipo_practica_clave, tp.nombre AS tipo_practica,
         o.id_usuario AS id_usuario_ofertador, o.puesto AS ofertador_puesto,
         uo.nombre AS ofertador_nombre, uo.apellido_paterno AS ofertador_apellido, uo.email AS ofertador_email,
         COALESCE(e.nombre, 'Universidad Autónoma de Chiapas') AS empresa,
         av.horas_requeridas, av.horas_acumuladas, av.ultima_fecha_bitacora, av.dias_sin_registro,
         ca.id_carta_aceptacion, ca.generada_en AS carta_aceptacion_en
    FROM practicas.practica_alumno pa
    JOIN practicas.v_avance_practica av ON av.id_practica = pa.id_practica
    JOIN core.alumnos al ON al.id_alumno = pa.id_alumno
    JOIN core.usuarios ua ON ua.id_usuario = al.id_usuario
    JOIN core.carreras car ON car.id_carrera = al.id_carrera
    JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
    JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
    JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
    JOIN core.usuarios uo ON uo.id_usuario = o.id_usuario
    LEFT JOIN practicas.empresas e ON e.id_empresa = o.id_empresa
    LEFT JOIN practicas.cartas_aceptacion ca ON ca.id_practica = pa.id_practica`;

async function obtener(idPractica, db = pool) {
  const { rows } = await db.query(`${PRACTICA} WHERE pa.id_practica = $1`, [idPractica]);
  return rows[0] || null;
}

async function deAlumno(idUsuarioAlumno) {
  const { rows } = await pool.query(
    `${PRACTICA} WHERE al.id_usuario = $1
      ORDER BY (pa.estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) DESC, pa.fecha_inicio DESC, pa.id_practica DESC`,
    [idUsuarioAlumno],
  );
  return rows;
}

async function deOfertador(idUsuarioOfertador, { estado }) {
  const { rows } = await pool.query(
    `${PRACTICA} WHERE o.id_usuario = $1 AND ($2::text IS NULL OR pa.estado = $2)
      ORDER BY (pa.estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) DESC, pa.fecha_inicio DESC`,
    [idUsuarioOfertador, estado || null],
  );
  return rows;
}

async function listar({ estado, q, sinBitacora }) {
  const { rows } = await pool.query(
    `${PRACTICA}
      WHERE ($1::text IS NULL OR pa.estado = $1)
        AND ($2::text IS NULL OR al.matricula ILIKE '%' || $2 || '%' OR v.titulo ILIKE '%' || $2 || '%'
             OR COALESCE(e.nombre, '') ILIKE '%' || $2 || '%'
             OR (ua.nombre || ' ' || ua.apellido_paterno || ' ' || COALESCE(ua.apellido_materno, '')) ILIKE '%' || $2 || '%')
        AND ($3::int IS NULL OR (pa.estado = 'ACTIVA' AND av.dias_sin_registro >= $3))
      ORDER BY (pa.estado = 'EN_REVISION_CIERRE') DESC, av.dias_sin_registro DESC, pa.fecha_inicio DESC`,
    [estado || null, q || null, sinBitacora || null],
  );
  return rows;
}

// Conteos para el tablero de administración
async function resumen() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*) FROM practicas.practica_alumno WHERE estado = 'ACTIVA') AS practicas_activas,
       (SELECT count(*) FROM practicas.practica_alumno WHERE estado = 'EN_REVISION_CIERRE') AS cierres_pendientes,
       (SELECT count(*) FROM practicas.v_avance_practica WHERE estado = 'ACTIVA' AND dias_sin_registro >= 3) AS sin_bitacora,
       (SELECT count(*) FROM practicas.cartas_presentacion WHERE estado = 'ESCANEO_SUBIDO') AS cartas_por_revisar,
       (SELECT count(*) FROM practicas.incidencias WHERE estado = 'ABIERTA') AS incidencias_abiertas,
       (SELECT count(*) FROM practicas.solicitudes_baja WHERE estado = 'EN_REVISION_ACADEMICA') AS bajas_en_revision,
       (SELECT count(*) FROM practicas.solicitudes_baja WHERE estado = 'ESCALADA') AS bajas_escaladas,
       (SELECT count(*) FROM practicas.vacantes WHERE estado = 'ABIERTA') AS vacantes_abiertas,
       (SELECT count(*) FROM core.alumnos) AS alumnos,
       (SELECT count(*) FROM practicas.practica_alumno WHERE estado = 'CERRADA') AS practicas_cerradas`,
  );
  return rows[0];
}

// ---------- cierre ----------

async function solicitarCierre(idPractica, idUsuario, db = pool) {
  await db.query(
    `UPDATE practicas.practica_alumno
        SET estado = 'EN_REVISION_CIERRE', cierre_solicitado_por = $2, cierre_solicitado_en = now()
      WHERE id_practica = $1`,
    [idPractica, idUsuario],
  );
}

// Proyecto por contrato: el ofertador lo marca como entregado y con eso se pide la revisión del cierre
async function marcarProyectoCompletado(idPractica, idUsuario, db = pool) {
  await db.query(
    `UPDATE practicas.practica_alumno
        SET proyecto_completado_en = now(), proyecto_completado_por = $2,
            estado = 'EN_REVISION_CIERRE', cierre_solicitado_por = $2, cierre_solicitado_en = now()
      WHERE id_practica = $1`,
    [idPractica, idUsuario],
  );
}

async function confirmarCierre(idPractica, idAdmin, observaciones, db = pool) {
  await db.query(
    `UPDATE practicas.practica_alumno
        SET estado = 'CERRADA', cerrada_por = $2, cerrada_en = now(), fecha_fin = current_date,
            observaciones_cierre = $3
      WHERE id_practica = $1`,
    [idPractica, idAdmin, observaciones],
  );
}

// El admin no aprueba el cierre: la práctica sigue (el trigger limpia la solicitud).
// En proyectos se borra también la marca de completado para que el ofertador la vuelva a dar.
async function reabrir(idPractica, observaciones, db = pool) {
  await db.query(
    `UPDATE practicas.practica_alumno
        SET estado = 'ACTIVA', observaciones_cierre = $2,
            proyecto_completado_en = NULL, proyecto_completado_por = NULL
      WHERE id_practica = $1`,
    [idPractica, observaciones],
  );
}

// ---------- tareas ----------

async function tareas(idPractica) {
  const { rows } = await pool.query(
    `SELECT t.id_tarea, t.titulo, t.descripcion, t.fecha_limite, t.estado, t.creada_en,
            COALESCE(json_agg(json_build_object(
                'id_evidencia', ev.id_evidencia, 'nombre_archivo', ev.nombre_archivo,
                'mime_type', ev.mime_type, 'subido_en', ev.subido_en)
              ORDER BY ev.subido_en) FILTER (WHERE ev.id_evidencia IS NOT NULL), '[]'::json) AS evidencias
       FROM practicas.tareas t
       LEFT JOIN practicas.tarea_evidencias ev ON ev.id_tarea = t.id_tarea
      WHERE t.id_practica = $1
      GROUP BY t.id_tarea
      ORDER BY (t.estado = 'COMPLETADA'), t.fecha_limite, t.id_tarea`,
    [idPractica],
  );
  return rows;
}

async function obtenerTarea(idTarea, db = pool) {
  const { rows } = await db.query(
    `SELECT t.*, al.id_usuario AS id_usuario_alumno, o.id_usuario AS id_usuario_ofertador, pa.estado AS estado_practica
       FROM practicas.tareas t
       JOIN practicas.practica_alumno pa ON pa.id_practica = t.id_practica
       JOIN core.alumnos al ON al.id_alumno = pa.id_alumno
       JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
       JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
      WHERE t.id_tarea = $1`,
    [idTarea],
  );
  return rows[0] || null;
}

async function crearTarea(idPractica, idUsuario, { titulo, descripcion, fechaLimite }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO practicas.tareas (id_practica, creada_por, titulo, descripcion, fecha_limite)
     VALUES ($1, $2, $3, $4, $5) RETURNING id_tarea`,
    [idPractica, idUsuario, titulo, descripcion, fechaLimite],
  );
  return rows[0].id_tarea;
}

async function cambiarEstadoTarea(idTarea, estado, db = pool) {
  await db.query('UPDATE practicas.tareas SET estado = $2 WHERE id_tarea = $1', [idTarea, estado]);
}

async function agregarEvidencia(idTarea, { nombreArchivo, rutaRelativa, mimeType, subidoPor }, db = pool) {
  await db.query(
    `INSERT INTO practicas.tarea_evidencias (id_tarea, nombre_archivo, ruta_relativa, mime_type, subido_por)
     VALUES ($1, $2, $3, $4, $5)`,
    [idTarea, nombreArchivo, rutaRelativa, mimeType, subidoPor],
  );
}

async function obtenerEvidencia(idEvidencia) {
  const { rows } = await pool.query(
    'SELECT id_evidencia, id_tarea, nombre_archivo, ruta_relativa FROM practicas.tarea_evidencias WHERE id_evidencia = $1',
    [idEvidencia],
  );
  return rows[0] || null;
}

// ---------- carta de aceptación ----------

async function obtenerCartaAceptacion(idPractica, db = pool) {
  const { rows } = await db.query('SELECT * FROM practicas.cartas_aceptacion WHERE id_practica = $1', [idPractica]);
  return rows[0] || null;
}

async function crearCartaAceptacion(idPractica, idUsuario, datos, db = pool) {
  await db.query(
    `INSERT INTO practicas.cartas_aceptacion (id_practica, generada_por, datos) VALUES ($1, $2, $3)
     ON CONFLICT (id_practica) DO NOTHING`,
    [idPractica, idUsuario, datos],
  );
}

module.exports = {
  obtener, deAlumno, deOfertador, listar, resumen,
  solicitarCierre, marcarProyectoCompletado, confirmarCierre, reabrir,
  tareas, obtenerTarea, crearTarea, cambiarEstadoTarea, agregarEvidencia, obtenerEvidencia,
  obtenerCartaAceptacion, crearCartaAceptacion,
};
