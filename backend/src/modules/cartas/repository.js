const pool = require('../../config/db');

const CARTA = `
  SELECT c.id_carta, c.id_alumno, c.datos, c.generada_en, c.ruta_escaneo, c.escaneo_subido_en,
         c.estado, c.revisada_por, c.revisada_en, c.comentarios,
         a.id_usuario AS id_usuario_alumno, a.matricula,
         u.nombre, u.apellido_paterno, u.apellido_materno, u.email,
         car.nombre_carrera,
         rev.nombre AS revisor_nombre, rev.apellido_paterno AS revisor_apellido
    FROM practicas.cartas_presentacion c
    JOIN core.alumnos a ON a.id_alumno = c.id_alumno
    JOIN core.usuarios u ON u.id_usuario = a.id_usuario
    JOIN core.carreras car ON car.id_carrera = a.id_carrera
    LEFT JOIN core.usuarios rev ON rev.id_usuario = c.revisada_por`;

async function obtener(idCarta, db = pool) {
  const { rows } = await db.query(`${CARTA} WHERE c.id_carta = $1`, [idCarta]);
  return rows[0] || null;
}

async function listarPorAlumno(idAlumno) {
  const { rows } = await pool.query(`${CARTA} WHERE c.id_alumno = $1 ORDER BY c.generada_en DESC`, [idAlumno]);
  return rows;
}

// Bandeja del admin documental. Sin estado: todas, las por revisar primero.
async function listar({ estado, q }) {
  const { rows } = await pool.query(
    `${CARTA}
      WHERE ($1::text IS NULL OR c.estado = $1)
        AND ($2::text IS NULL OR a.matricula ILIKE '%' || $2 || '%'
             OR (u.nombre || ' ' || u.apellido_paterno || ' ' || COALESCE(u.apellido_materno, '')) ILIKE '%' || $2 || '%')
      ORDER BY (c.estado = 'ESCANEO_SUBIDO') DESC, COALESCE(c.escaneo_subido_en, c.generada_en) DESC`,
    [estado || null, q || null],
  );
  return rows;
}

// Carta "en curso" del alumno: cualquiera que no esté rechazada
async function vigentePorAlumno(idAlumno, db = pool) {
  const { rows } = await db.query(
    `SELECT id_carta, estado FROM practicas.cartas_presentacion
      WHERE id_alumno = $1 AND estado <> 'RECHAZADA' ORDER BY generada_en DESC LIMIT 1`,
    [idAlumno],
  );
  return rows[0] || null;
}

async function crear(idAlumno, datos, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO practicas.cartas_presentacion (id_alumno, datos) VALUES ($1, $2) RETURNING id_carta`,
    [idAlumno, datos],
  );
  return rows[0].id_carta;
}

async function guardarEscaneo(idCarta, rutaRelativa, db = pool) {
  await db.query(
    `UPDATE practicas.cartas_presentacion
        SET estado = 'ESCANEO_SUBIDO', ruta_escaneo = $2, escaneo_subido_en = now()
      WHERE id_carta = $1`,
    [idCarta, rutaRelativa],
  );
}

async function revisar(idCarta, { estado, idRevisor, comentarios }, db = pool) {
  await db.query(
    `UPDATE practicas.cartas_presentacion
        SET estado = $2, revisada_por = $3, revisada_en = now(), comentarios = $4
      WHERE id_carta = $1`,
    [idCarta, estado, idRevisor, comentarios ?? null],
  );
}

// ¿El usuario es el ofertador de alguna práctica que usa esta carta?
async function ofertadorTieneAcceso(idCarta, idUsuario) {
  const { rows } = await pool.query(
    `SELECT 1 FROM practicas.practica_alumno pa
      WHERE pa.id_carta_presentacion = $1
        AND practicas.fn_es_ofertador_de_practica(pa.id_practica, $2)
      LIMIT 1`,
    [idCarta, idUsuario],
  );
  return rows.length > 0;
}

module.exports = {
  obtener, listarPorAlumno, listar, vigentePorAlumno, crear, guardarEscaneo, revisar, ofertadorTieneAcceso,
};
