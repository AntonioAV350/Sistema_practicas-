-- 008_create_triggers_practicas.sql
-- Triggers del módulo Prácticas

-- ============================================================
-- TRIGGERS: vacantes y postulaciones
-- ============================================================

CREATE OR REPLACE FUNCTION practicas.fn_vacante_init()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.cupo_disponible := NEW.cupo_total;   -- al publicarla, todo el cupo está libre
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vacante_init
BEFORE INSERT ON practicas.vacantes
FOR EACH ROW EXECUTE FUNCTION practicas.fn_vacante_init();


CREATE OR REPLACE FUNCTION practicas.fn_validar_postulacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT practicas.fn_alumno_puede_postular(NEW.id_alumno) THEN
        RAISE EXCEPTION 'El alumno no puede postularse: necesita carta de presentación aprobada y no tener una práctica activa';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM practicas.vacantes
        WHERE id_vacante = NEW.id_vacante
          AND estado = 'ABIERTA' AND cupo_disponible > 0
          AND (cierra_en IS NULL OR cierra_en > now())
    ) THEN
        RAISE EXCEPTION 'La vacante % no está abierta o ya no tiene cupo', NEW.id_vacante;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_postulacion
BEFORE INSERT ON practicas.postulaciones
FOR EACH ROW EXECUTE FUNCTION practicas.fn_validar_postulacion();


-- ============================================================
-- TRIGGERS: carta de presentación
-- ============================================================

-- Solo el admin documental (o el superadmin) puede aprobar/rechazar.
-- El académico ve a los alumnos pero aquí no puede tocar nada.
CREATE OR REPLACE FUNCTION practicas.fn_carta_revision()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado IN ('APROBADA', 'RECHAZADA') THEN
        IF NEW.revisada_por IS NULL OR NOT core.fn_tiene_subrol(NEW.revisada_por, 'ADMIN_DOCUMENTAL') THEN
            RAISE EXCEPTION 'Solo el Administrador Documental puede aprobar o rechazar cartas de presentación';
        END IF;
        NEW.revisada_en := COALESCE(NEW.revisada_en, now());
    END IF;

    IF NEW.estado = 'ESCANEO_SUBIDO' THEN
        NEW.escaneo_subido_en := COALESCE(NEW.escaneo_subido_en, now());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_carta_revision
BEFORE INSERT OR UPDATE ON practicas.cartas_presentacion
FOR EACH ROW EXECUTE FUNCTION practicas.fn_carta_revision();


CREATE OR REPLACE FUNCTION practicas.fn_carta_notifica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_usuario_alumno BIGINT;
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NEW.estado = 'ESCANEO_SUBIDO' THEN
        PERFORM core.fn_notificar_rol('ADMIN', 'ADMIN_DOCUMENTAL', 'CARTA_POR_REVISAR',
            'Hay una carta de presentación por revisar', NULL, 'carta', NEW.id_carta);
    ELSIF NEW.estado IN ('APROBADA', 'RECHAZADA') THEN
        SELECT id_usuario INTO v_usuario_alumno FROM core.alumnos WHERE id_alumno = NEW.id_alumno;
        INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
        VALUES (v_usuario_alumno, (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS'),
                'CARTA_' || NEW.estado,
                CASE WHEN NEW.estado = 'APROBADA'
                     THEN 'Tu carta de presentación fue aprobada, ya puedes ver vacantes'
                     ELSE 'Tu carta de presentación fue rechazada' END,
                NEW.comentarios, 'carta', NEW.id_carta);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_carta_notifica
AFTER UPDATE OF estado ON practicas.cartas_presentacion
FOR EACH ROW EXECUTE FUNCTION practicas.fn_carta_notifica();


-- ============================================================
-- TRIGGERS: aceptaciones
-- ============================================================

CREATE OR REPLACE FUNCTION practicas.fn_aceptacion_antes_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_id_alumno BIGINT;
    v_usuario_ofertador BIGINT;
    v_estado_vacante VARCHAR;
BEGIN
    SELECT p.id_alumno, o.id_usuario, va.estado
      INTO v_id_alumno, v_usuario_ofertador, v_estado_vacante
    FROM practicas.postulaciones p
    JOIN practicas.vacantes va ON va.id_vacante = p.id_vacante
    JOIN practicas.ofertadores o ON o.id_ofertador = va.id_ofertador
    WHERE p.id_postulacion = NEW.id_postulacion AND p.estado = 'POSTULADA';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La postulación % no existe o ya no está vigente', NEW.id_postulacion;
    END IF;

    -- solo el dueño de la vacante puede aceptar
    IF NEW.aceptada_por <> v_usuario_ofertador THEN
        RAISE EXCEPTION 'Esa vacante no pertenece a este ofertador';
    END IF;

    IF v_estado_vacante <> 'ABIERTA' THEN
        RAISE EXCEPTION 'La vacante ya no está abierta';
    END IF;

    -- no tiene caso aceptar a alguien que ya está en una práctica
    IF EXISTS (SELECT 1 FROM practicas.practica_alumno
               WHERE id_alumno = v_id_alumno AND estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) THEN
        RAISE EXCEPTION 'El alumno ya tiene una práctica activa';
    END IF;

    NEW.estado := 'PENDIENTE';
    NEW.resuelta_en := NULL;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aceptacion_antes_insert
BEFORE INSERT ON practicas.aceptaciones
FOR EACH ROW EXECUTE FUNCTION practicas.fn_aceptacion_antes_insert();


-- avisa al alumno cuando le llega una aceptación
CREATE OR REPLACE FUNCTION practicas.fn_aceptacion_notifica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
    SELECT al.id_usuario, (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS'),
           'ACEPTACION_NUEVA', 'Te aceptaron en una vacante',
           'Tienes hasta el ' || to_char(NEW.expira_en, 'DD/MM/YYYY HH24:MI') || ' para confirmar',
           'aceptacion', NEW.id_aceptacion
    FROM practicas.postulaciones p
    JOIN core.alumnos al ON al.id_alumno = p.id_alumno
    WHERE p.id_postulacion = NEW.id_postulacion;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aceptacion_notifica
AFTER INSERT ON practicas.aceptaciones
FOR EACH ROW EXECUTE FUNCTION practicas.fn_aceptacion_notifica();


-- Una aceptación resuelta ya no se toca. Y al salir de PENDIENTE se sella la fecha.
CREATE OR REPLACE FUNCTION practicas.fn_aceptacion_antes_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La aceptación % ya está resuelta (%) y no se puede modificar', OLD.id_aceptacion, OLD.estado;
    END IF;
    IF NEW.estado <> 'PENDIENTE' THEN
        NEW.resuelta_en := now();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aceptacion_antes_update
BEFORE UPDATE ON practicas.aceptaciones
FOR EACH ROW EXECUTE FUNCTION practicas.fn_aceptacion_antes_update();


-- ============================================================
-- TRIGGERS: práctica (transiciones y cierre)
-- ============================================================

CREATE OR REPLACE FUNCTION practicas.fn_practica_transiciones()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_horas_req  INT;
    v_horas_acum NUMERIC;
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF OLD.estado IN ('CERRADA', 'BAJA') THEN
        RAISE EXCEPTION 'La práctica % ya terminó (%), no puede cambiar de estado', OLD.id_practica, OLD.estado;
    END IF;

    IF NOT ((OLD.estado = 'ACTIVA' AND NEW.estado IN ('EN_REVISION_CIERRE', 'BAJA'))
         OR (OLD.estado = 'EN_REVISION_CIERRE' AND NEW.estado IN ('ACTIVA', 'CERRADA', 'BAJA'))) THEN
        RAISE EXCEPTION 'Cambio de estado no permitido: % -> %', OLD.estado, NEW.estado;
    END IF;

    IF NEW.estado = 'EN_REVISION_CIERRE' THEN
        SELECT tp.horas_requeridas INTO v_horas_req
        FROM practicas.vacantes v
        JOIN practicas.tipos_practica tp ON tp.id_tipo_practica = v.id_tipo_practica
        WHERE v.id_vacante = NEW.id_vacante;

        IF v_horas_req IS NOT NULL THEN
            -- modalidad por horas: tiene que haber juntado las horas
            SELECT COALESCE(SUM(horas), 0) INTO v_horas_acum
            FROM practicas.bitacora WHERE id_practica = NEW.id_practica;
            IF v_horas_acum < v_horas_req THEN
                RAISE EXCEPTION 'Faltan horas para solicitar el cierre (% de %)', v_horas_acum, v_horas_req;
            END IF;
        ELSE
            -- contrato/proyecto: no importan las horas, el ofertador tiene que haberlo marcado como completado
            IF NEW.proyecto_completado_en IS NULL THEN
                RAISE EXCEPTION 'El ofertador aún no marca el proyecto como completado';
            END IF;
        END IF;
        NEW.cierre_solicitado_en := COALESCE(NEW.cierre_solicitado_en, now());

    ELSIF NEW.estado = 'CERRADA' THEN
        -- aquí está la regla de que ningún cierre es automático
        IF NEW.cerrada_por IS NULL OR NOT core.fn_es_admin(NEW.cerrada_por) THEN
            RAISE EXCEPTION 'El cierre lo tiene que confirmar un Administrador';
        END IF;
        NEW.cerrada_en := COALESCE(NEW.cerrada_en, now());
        NEW.fecha_fin  := COALESCE(NEW.fecha_fin, current_date);

    ELSIF NEW.estado = 'ACTIVA' THEN
        -- el admin no aprobó el cierre, la práctica sigue y se limpia la solicitud
        NEW.cierre_solicitado_en  := NULL;
        NEW.cierre_solicitado_por := NULL;

    ELSIF NEW.estado = 'BAJA' THEN
        NEW.fecha_fin := COALESCE(NEW.fecha_fin, current_date);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_practica_transiciones
BEFORE UPDATE ON practicas.practica_alumno
FOR EACH ROW EXECUTE FUNCTION practicas.fn_practica_transiciones();


-- tareas y bitácora solo se pueden crear mientras la práctica está ACTIVA.
-- (una práctica dada de baja no reabre nada: si el alumno entra a otra,
-- es una fila nueva en practica_alumno y arranca en ceros)
CREATE OR REPLACE FUNCTION practicas.fn_exigir_practica_activa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM practicas.practica_alumno
                   WHERE id_practica = NEW.id_practica AND estado = 'ACTIVA') THEN
        RAISE EXCEPTION 'La práctica % no está activa', NEW.id_practica;
    END IF;

   IF TG_TABLE_NAME = 'bitacora' THEN
        IF NEW.fecha > current_date THEN
            RAISE EXCEPTION 'No se puede registrar bitácora con fecha futura';
        END IF;
    END IF;
   
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bitacora_practica_activa
BEFORE INSERT ON practicas.bitacora
FOR EACH ROW EXECUTE FUNCTION practicas.fn_exigir_practica_activa();

CREATE TRIGGER trg_tareas_practica_activa
BEFORE INSERT ON practicas.tareas
FOR EACH ROW EXECUTE FUNCTION practicas.fn_exigir_practica_activa();


-- ============================================================
-- TRIGGERS: incidencias y bajas
-- ============================================================

-- Sirve para incidencias y solicitudes de baja: solo las puede registrar
-- el ofertador de esa práctica, y la práctica tiene que seguir viva.
CREATE OR REPLACE FUNCTION practicas.fn_validar_reporte_ofertador()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_usuario BIGINT;
BEGIN
    IF TG_TABLE_NAME = 'incidencias' THEN
        v_usuario := NEW.reportada_por;
    ELSE
        v_usuario := NEW.solicitada_por;
    END IF;

    IF NOT practicas.fn_es_ofertador_de_practica(NEW.id_practica, v_usuario) THEN
        RAISE EXCEPTION 'Solo el ofertador de la práctica puede registrar esto';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM practicas.practica_alumno
                   WHERE id_practica = NEW.id_practica AND estado IN ('ACTIVA', 'EN_REVISION_CIERRE')) THEN
        RAISE EXCEPTION 'La práctica % ya no está en curso', NEW.id_practica;
    END IF;

    IF TG_TABLE_NAME = 'solicitudes_baja' THEN
        NEW.estado := 'EN_REVISION_ACADEMICA';   -- siempre arranca con el académico
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidencia_validar
BEFORE INSERT ON practicas.incidencias
FOR EACH ROW EXECUTE FUNCTION practicas.fn_validar_reporte_ofertador();

CREATE TRIGGER trg_baja_validar
BEFORE INSERT ON practicas.solicitudes_baja
FOR EACH ROW EXECUTE FUNCTION practicas.fn_validar_reporte_ofertador();


-- les llega primero al admin académico
CREATE OR REPLACE FUNCTION practicas.fn_reporte_notifica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'incidencias' THEN
        PERFORM core.fn_notificar_rol('ADMIN', 'ADMIN_ACADEMICO', 'INCIDENCIA_NUEVA',
            'Nueva incidencia registrada', LEFT(NEW.descripcion, 200), 'incidencia', NEW.id_incidencia);
    ELSE
        PERFORM core.fn_notificar_rol('ADMIN', 'ADMIN_ACADEMICO', 'BAJA_SOLICITADA',
            'Nueva solicitud de baja', LEFT(NEW.motivo, 200), 'baja', NEW.id_solicitud);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidencia_notifica
AFTER INSERT ON practicas.incidencias
FOR EACH ROW EXECUTE FUNCTION practicas.fn_reporte_notifica();

CREATE TRIGGER trg_baja_notifica
AFTER INSERT ON practicas.solicitudes_baja
FOR EACH ROW EXECUTE FUNCTION practicas.fn_reporte_notifica();


-- al resolver una incidencia se sella quién y cuándo
CREATE OR REPLACE FUNCTION practicas.fn_incidencia_resolver()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado = 'RESUELTA' AND OLD.estado = 'ABIERTA' THEN
        IF NEW.atendida_por IS NULL OR NOT core.fn_tiene_subrol(NEW.atendida_por, 'ADMIN_ACADEMICO') THEN
            RAISE EXCEPTION 'Las incidencias las atiende el Administrador Académico';
        END IF;
        NEW.resuelta_en := COALESCE(NEW.resuelta_en, now());
    ELSIF OLD.estado = 'RESUELTA' THEN
        RAISE EXCEPTION 'La incidencia % ya está resuelta', OLD.id_incidencia;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidencia_resolver
BEFORE UPDATE ON practicas.incidencias
FOR EACH ROW EXECUTE FUNCTION practicas.fn_incidencia_resolver();


-- Reglas del recorrido de la baja. Lo importante: APROBADA/RECHAZADA solo
-- salen de ESCALADA y solo las puede poner un SUPERADMIN. O sea, ninguna
-- baja se aprueba sin pasar por el director.
CREATE OR REPLACE FUNCTION practicas.fn_baja_transiciones()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF OLD.estado IN ('RESUELTA_SIN_BAJA', 'APROBADA', 'RECHAZADA') THEN
        RAISE EXCEPTION 'La solicitud % ya está cerrada (%)', OLD.id_solicitud, OLD.estado;
    END IF;

    IF OLD.estado = 'EN_REVISION_ACADEMICA' THEN
        IF NEW.estado NOT IN ('RESUELTA_SIN_BAJA', 'ESCALADA') THEN
            RAISE EXCEPTION 'Una baja en revisión académica solo puede resolverse o escalarse';
        END IF;
        IF NEW.atendida_por IS NULL OR NOT core.fn_tiene_subrol(NEW.atendida_por, 'ADMIN_ACADEMICO') THEN
            RAISE EXCEPTION 'Esto lo atiende el Administrador Académico';
        END IF;
        IF NEW.estado = 'ESCALADA' THEN
            NEW.escalada_en := COALESCE(NEW.escalada_en, now());
        ELSE
            NEW.resuelta_en := COALESCE(NEW.resuelta_en, now());
        END IF;

    ELSIF OLD.estado = 'ESCALADA' THEN
        IF NEW.estado NOT IN ('APROBADA', 'RECHAZADA') THEN
            RAISE EXCEPTION 'Una baja escalada solo se puede aprobar o rechazar';
        END IF;
        IF NEW.decidida_por IS NULL OR NOT core.fn_tiene_rol(NEW.decidida_por, 'SUPERADMIN') THEN
            RAISE EXCEPTION 'Solo el Superadministrador puede aprobar o rechazar una baja';
        END IF;
        NEW.decidida_en := COALESCE(NEW.decidida_en, now());
        NEW.resuelta_en := COALESCE(NEW.resuelta_en, now());
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_baja_transiciones
BEFORE UPDATE ON practicas.solicitudes_baja
FOR EACH ROW EXECUTE FUNCTION practicas.fn_baja_transiciones();


-- Lo que pasa después de cada cambio de estado en una baja
CREATE OR REPLACE FUNCTION practicas.fn_baja_efectos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_usuario_alumno BIGINT;
    v_mod SMALLINT := (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS');
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NEW.estado = 'ESCALADA' THEN
        PERFORM core.fn_notificar_rol('SUPERADMIN', NULL, 'BAJA_ESCALADA',
            'Una baja necesita tu decisión', LEFT(NEW.motivo, 200), 'baja', NEW.id_solicitud);

    ELSIF NEW.estado = 'APROBADA' THEN
        -- La práctica queda en BAJA. Como el índice uq_practica_viva ya no la cuenta,
        -- el alumno queda libre para postularse. Su bitácora y tareas se quedan
        -- ligadas a esta práctica (expediente), la siguiente empieza limpia.
        UPDATE practicas.practica_alumno
           SET estado = 'BAJA'
         WHERE id_practica = NEW.id_practica AND estado IN ('ACTIVA', 'EN_REVISION_CIERRE');

        SELECT al.id_usuario INTO v_usuario_alumno
        FROM practicas.practica_alumno pa JOIN core.alumnos al ON al.id_alumno = pa.id_alumno
        WHERE pa.id_practica = NEW.id_practica;

        INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, entidad, id_entidad)
        VALUES (v_usuario_alumno, v_mod, 'BAJA_APROBADA',
                'Tu práctica fue dada de baja, ya puedes postularte de nuevo', 'baja', NEW.id_solicitud);
    END IF;

    -- al ofertador que la pidió siempre se le avisa el resultado final
    IF NEW.estado IN ('RESUELTA_SIN_BAJA', 'APROBADA', 'RECHAZADA') THEN
        INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, entidad, id_entidad)
        VALUES (NEW.solicitada_por, v_mod, 'BAJA_' || NEW.estado,
                'Resultado de tu solicitud de baja: ' || NEW.estado, 'baja', NEW.id_solicitud);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_baja_efectos
AFTER UPDATE OF estado ON practicas.solicitudes_baja
FOR EACH ROW EXECUTE FUNCTION practicas.fn_baja_efectos();


