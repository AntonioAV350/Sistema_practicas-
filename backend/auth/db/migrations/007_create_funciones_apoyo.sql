-- 007_create_funciones_apoyo.sql
-- Funciones de apoyo (permisos y notificaciones)

-- ============================================================
-- FUNCIONES DE APOYO (permisos y notificaciones)
-- ============================================================

CREATE OR REPLACE FUNCTION core.fn_tiene_rol(p_id_usuario BIGINT, p_rol VARCHAR)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM core.usuario_roles ur
        JOIN core.roles r ON r.id_rol = ur.id_rol
        JOIN core.usuarios u ON u.id_usuario = ur.id_usuario
        WHERE ur.id_usuario = p_id_usuario AND r.clave = p_rol AND u.activo
    );
$$;

-- El superadmin cuenta como si tuviera todos los subroles (doc: "tiene todo lo del Administrador")
CREATE OR REPLACE FUNCTION core.fn_tiene_subrol(p_id_usuario BIGINT, p_subrol VARCHAR)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT core.fn_tiene_rol(p_id_usuario, 'SUPERADMIN')
        OR EXISTS (
            SELECT 1
            FROM core.usuario_roles ur
            JOIN core.subroles s ON s.id_subrol = ur.id_subrol
            JOIN core.usuarios u ON u.id_usuario = ur.id_usuario
            WHERE ur.id_usuario = p_id_usuario AND s.clave = p_subrol AND u.activo
        );
$$;

-- admin de cualquier subrol, o superadmin
CREATE OR REPLACE FUNCTION core.fn_es_admin(p_id_usuario BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT core.fn_tiene_rol(p_id_usuario, 'SUPERADMIN') OR core.fn_tiene_rol(p_id_usuario, 'ADMIN');
$$;

-- Permiso por clave. Superadmin siempre pasa; el resto por su rol o su subrol.
CREATE OR REPLACE FUNCTION core.fn_tiene_permiso(p_id_usuario BIGINT, p_permiso VARCHAR)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT core.fn_tiene_rol(p_id_usuario, 'SUPERADMIN')
        OR EXISTS (
            SELECT 1
            FROM core.usuario_roles ur
            JOIN core.usuarios u ON u.id_usuario = ur.id_usuario AND u.activo
            LEFT JOIN core.rol_permisos rp ON rp.id_rol = ur.id_rol
            LEFT JOIN core.subrol_permisos sp ON sp.id_subrol = ur.id_subrol
            JOIN core.permisos p ON p.id_permiso IN (rp.id_permiso, sp.id_permiso)
            WHERE ur.id_usuario = p_id_usuario AND p.clave = p_permiso
        );
$$;

-- Manda una notificación a todos los usuarios activos de un rol (y subrol, si se indica)
CREATE OR REPLACE FUNCTION core.fn_notificar_rol(
    p_rol VARCHAR, p_subrol VARCHAR, p_tipo VARCHAR, p_titulo VARCHAR,
    p_mensaje TEXT, p_entidad VARCHAR, p_id_entidad BIGINT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO core.notificaciones (id_usuario, id_modulo, tipo, titulo, mensaje, entidad, id_entidad)
    SELECT DISTINCT u.id_usuario,
           (SELECT id_modulo FROM core.modulos WHERE clave = 'PRACTICAS'),
           p_tipo, p_titulo, p_mensaje, p_entidad, p_id_entidad
    FROM core.usuario_roles ur
    JOIN core.roles r ON r.id_rol = ur.id_rol
    LEFT JOIN core.subroles s ON s.id_subrol = ur.id_subrol
    JOIN core.usuarios u ON u.id_usuario = ur.id_usuario
    WHERE u.activo AND r.clave = p_rol AND (p_subrol IS NULL OR s.clave = p_subrol);
END;
$$;

-- Un alumno puede ver/postularse a vacantes solo si tiene carta aprobada
-- y no tiene una práctica en curso. El backend lo usa para mostrar u ocultar
-- las vacantes, y abajo el trigger de postulaciones lo vuelve a validar.
CREATE OR REPLACE FUNCTION practicas.fn_alumno_puede_postular(p_id_alumno BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM practicas.cartas_presentacion c
                   WHERE c.id_alumno = p_id_alumno AND c.estado = 'APROBADA')
       AND NOT EXISTS (SELECT 1 FROM practicas.practica_alumno pa
                       WHERE pa.id_alumno = p_id_alumno AND pa.estado IN ('ACTIVA', 'EN_REVISION_CIERRE'));
$$;

-- ¿este usuario es el ofertador dueño de la vacante de esa práctica?
CREATE OR REPLACE FUNCTION practicas.fn_es_ofertador_de_practica(p_id_practica BIGINT, p_id_usuario BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM practicas.practica_alumno pa
        JOIN practicas.vacantes v ON v.id_vacante = pa.id_vacante
        JOIN practicas.ofertadores o ON o.id_ofertador = v.id_ofertador
        WHERE pa.id_practica = p_id_practica AND o.id_usuario = p_id_usuario
    );
$$;

