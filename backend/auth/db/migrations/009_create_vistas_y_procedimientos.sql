-- 009_create_vistas_y_procedimientos.sql
-- Vistas y procedimientos almacenados

-- ============================================================
-- VISTAS
-- ============================================================

-- Avance de cada práctica: horas juntadas y días sin bitácora.
-- La usan el job de recordatorios y las pantallas de los admins.
CREATE OR REPLACE VIEW practicas.v_avance_practica AS
SELECT pa.id_practica,
       pa.id_alumno,
       pa.estado,
       tp.horas_requeridas,
       COALESCE(SUM(b.horas), 0)  AS horas_acumuladas,
       MAX(b.fecha)               AS ultima_fecha_bitacora,
       MAX(b.creado_en)           AS ultimo_registro_en,
       -- si nunca ha registrado nada se cuenta desde que empezó
       (current_date - COALESCE(MAX(b.fecha), pa.fecha_inicio)) AS dias_sin_registro
FROM practicas.practica_alumno pa
JOIN practicas.vacantes v        ON v.id_vacante = pa.id_vacante
JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
LEFT JOIN practicas.bitacora b   ON b.id_practica = pa.id_practica
GROUP BY pa.id_practica, tp.id_tipo_practica;

-- vacantes que se pueden mostrar. Ojo: al alumno además hay que validarle
-- fn_alumno_puede_postular() antes de enseñarle la lista.
CREATE OR REPLACE VIEW practicas.v_vacantes_abiertas AS
SELECT v.*, tp.nombre AS tipo_practica, tp.horas_requeridas
FROM practicas.vacantes v
JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
WHERE v.estado = 'ABIERTA' AND v.cupo_disponible > 0
  AND (v.cierra_en IS NULL OR v.cierra_en > now());


-- ============================================================
-- PROCEDIMIENTOS: confirmar aceptación y jobs periódicos
-- ============================================================

-- Cuando el alumno confirma una aceptación pasa todo esto junto, en una
-- sola transacción (si algo falla no se queda nada a medias):
--   - se cierran las demás aceptaciones pendientes del alumno
--   - se crea la práctica con fecha de inicio (esto activa tareas y bitácora
--     y bloquea al alumno por el índice uq_practica_viva)
--   - se guarda la carta validada ligada a la práctica (así el ofertador la ve)
--   - baja el cupo de la vacante
--   - se avisa al ofertador y al admin documental
-- La carta de aceptación la genera después el ofertador (tabla cartas_aceptacion).
CREATE OR REPLACE FUNCTION practicas.sp_confirmar_aceptacion(p_id_aceptacion BIGINT, p_id_usuario BIGINT)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
    v_estado      VARCHAR;
    v_expira      TIMESTAMPTZ;
    v_id_alumno   BIGINT;
    v_id_vacante  BIGINT;
    v_id_carta    BIGINT;
    v_cupo        INT;
    v_titulo      VARCHAR;
    v_usr_ofertador BIGINT;
    v_id_practica BIGINT;
    v_mod         SMALLINT := (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS');
BEGIN
    SELECT a.estado, a.expira_en, p.id_alumno, p.id_vacante
      INTO v_estado, v_expira, v_id_alumno, v_id_vacante
    FROM practicas.aceptaciones a
    JOIN practicas.postulaciones p ON p.id_postulacion = a.id_postulacion
    WHERE a.id_aceptacion = p_id_aceptacion
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la aceptación %', p_id_aceptacion;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM core.alumnos WHERE id_alumno = v_id_alumno AND id_usuario = p_id_usuario) THEN
        RAISE EXCEPTION 'Esa aceptación no es de este alumno';
    END IF;

    IF v_estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La aceptación ya no está pendiente (%)', v_estado;
    END IF;

    IF v_expira <= now() THEN
        RAISE EXCEPTION 'La aceptación ya expiró';
    END IF;

    SELECT id_carta INTO v_id_carta
    FROM practicas.cartas_presentacion
    WHERE id_alumno = v_id_alumno AND estado = 'APROBADA';
    IF v_id_carta IS NULL THEN
        RAISE EXCEPTION 'El alumno no tiene carta de presentación aprobada';
    END IF;

    -- bloqueamos la vacante para que dos alumnos no se lleven el último lugar a la vez
    SELECT va.cupo_disponible, va.titulo, o.id_usuario
      INTO v_cupo, v_titulo, v_usr_ofertador
    FROM practicas.vacantes va
    JOIN practicas.ofertadores o ON o.id_ofertador = va.id_ofertador
    WHERE va.id_vacante = v_id_vacante
    FOR UPDATE OF va;

    IF v_cupo <= 0 THEN
        RAISE EXCEPTION 'La vacante ya no tiene cupo';
    END IF;

    IF EXISTS (SELECT 1 FROM practicas.practica_alumno
               WHERE id_alumno = v_id_alumno AND estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) THEN
        RAISE EXCEPTION 'El alumno ya tiene una práctica activa';
    END IF;

    UPDATE practicas.aceptaciones SET estado = 'CONFIRMADA' WHERE id_aceptacion = p_id_aceptacion;

    -- las demás pendientes del mismo alumno se cierran solas
    UPDATE practicas.aceptaciones a
       SET estado = 'CERRADA_POR_CONFIRMACION'
      FROM practicas.postulaciones p
     WHERE p.id_postulacion = a.id_postulacion
       AND p.id_alumno = v_id_alumno
       AND a.estado = 'PENDIENTE';

    INSERT INTO practicas.practica_alumno (id_aceptacion, id_alumno, id_vacante, id_carta_presentacion)
    VALUES (p_id_aceptacion, v_id_alumno, v_id_vacante, v_id_carta)
    RETURNING id_practica INTO v_id_practica;

    UPDATE practicas.vacantes
       SET cupo_disponible = cupo_disponible - 1,
           estado = CASE WHEN cupo_disponible - 1 = 0 THEN 'CERRADA' ELSE estado END
     WHERE id_vacante = v_id_vacante;

    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
    VALUES (v_usr_ofertador, v_mod, 'PRACTICA_CONFIRMADA',
            'Un alumno confirmó su práctica en: ' || v_titulo,
            'Ya puedes ver su carta de presentación y generar la carta de aceptación',
            'practica', v_id_practica);

    PERFORM core.fn_notificar_rol('ADMIN', 'ADMIN_DOCUMENTAL', 'PRACTICA_CONFIRMADA',
            'Se confirmó una nueva práctica', v_titulo, 'practica', v_id_practica);

    RETURN v_id_practica;
END;
$$;


-- Marca como EXPIRADA toda aceptación pendiente que ya pasó de las 48 h.
-- Hay que correrla cada tanto (cada 5-10 min está bien). Regresa cuántas expiró.
CREATE OR REPLACE FUNCTION practicas.sp_expirar_aceptaciones()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_total INT;
BEGIN
    WITH exp AS (
        UPDATE practicas.aceptaciones
           SET estado = 'EXPIRADA'
         WHERE estado = 'PENDIENTE' AND expira_en <= now()
        RETURNING id_aceptacion, id_postulacion
    )
    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, entidad, id_entidad)
    SELECT al.id_usuario, (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS'),
           'ACEPTACION_EXPIRADA', 'Una aceptación expiró por no atenderla en 48 horas',
           'aceptacion', exp.id_aceptacion
    FROM exp
    JOIN practicas.postulaciones p ON p.id_postulacion = exp.id_postulacion
    JOIN core.alumnos al ON al.id_alumno = p.id_alumno;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN v_total;
END;
$$;


-- Revisión de bitácoras (correrla una vez al día, de noche):
--   1 día sin registrar  -> recordatorio al alumno
--   3 días o más         -> alerta a los admin académicos
-- Cada aviso sale una sola vez por "hueco": si el alumno vuelve a registrar
-- y luego se vuelve a ausentar, se vuelve a avisar.
CREATE OR REPLACE FUNCTION practicas.sp_revisar_bitacoras()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_mod SMALLINT := (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS');
BEGIN
    -- recordatorio al alumno
    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
    SELECT al.id_usuario, v_mod, 'BITACORA_RECORDATORIO',
           'No has registrado tu bitácora',
           'Llevas ' || av.dias_sin_registro || ' día(s) sin registrar actividad',
           'practica', av.id_practica
    FROM practicas.v_avance_practica av
    JOIN core.alumnos al ON al.id_alumno = av.id_alumno
    WHERE av.estado = 'ACTIVA'
      AND av.dias_sin_registro >= 1
      AND NOT EXISTS (
          SELECT 1 FROM core.notificaciones n
          WHERE n.tipo = 'BITACORA_RECORDATORIO' AND n.entidad = 'practica'
            AND n.id_entidad = av.id_practica
            AND n.creada_en > COALESCE(av.ultimo_registro_en, '-infinity'::timestamptz)
            AND n.creada_en >= (SELECT fecha_inicio FROM practicas.practica_alumno WHERE id_practica = av.id_practica)
      );

    -- alerta a los admin académicos (a cada uno)
    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
    SELECT adm.id_usuario, v_mod, 'BITACORA_ALERTA',
           'Un alumno lleva días sin bitácora',
           'Práctica ' || av.id_practica || ': ' || av.dias_sin_registro || ' días sin registrar',
           'practica', av.id_practica
    FROM practicas.v_avance_practica av
    CROSS JOIN (
        SELECT DISTINCT ur.id_usuario
        FROM core.usuario_roles ur
        JOIN core.subroles s ON s.id_subrol = ur.id_subrol
        JOIN core.usuarios u ON u.id_usuario = ur.id_usuario
        WHERE s.clave = 'ADMIN_ACADEMICO' AND u.activo
    ) adm
    WHERE av.estado = 'ACTIVA'
      AND av.dias_sin_registro >= 3
      AND NOT EXISTS (
          SELECT 1 FROM core.notificaciones n
          WHERE n.tipo = 'BITACORA_ALERTA' AND n.entidad = 'practica'
            AND n.id_entidad = av.id_practica AND n.id_usuario = adm.id_usuario
            AND n.creada_en > COALESCE(av.ultimo_registro_en, '-infinity'::timestamptz)
            AND n.creada_en >= (SELECT fecha_inicio FROM practicas.practica_alumno WHERE id_practica = av.id_practica)
      );
END;
$$;

-- Si tienen la extensión pg_cron se pueden programar aquí mismo.
-- Si no, que el backend las llame con un cron normal.
-- SELECT cron.schedule('expirar-aceptaciones', '*/10 * * * *', 'SELECT practicas.sp_expirar_aceptaciones()');
-- SELECT cron.schedule('revisar-bitacoras',     '0 23 * * *',   'SELECT practicas.sp_revisar_bitacoras()');

