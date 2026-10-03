-- Para agregar un módulo nuevo después (residencias, proyectos, lo que
-- sea) la idea es:
--   1. crear su propio schema
--   2. darlo de alta en core.modulos
--   3. meter sus permisos en core.permisos y asignarlos a roles/subroles
-- Con eso no se toca nada de lo que ya está.

-- CREATE DATABASE practicas_db;
-- \c practicas_db

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS practicas;
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- CORE: usuarios, roles, permisos, módulos
CREATE TABLE core.usuarios (
    id_usuario        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username          VARCHAR(50)  NOT NULL UNIQUE,
    email             VARCHAR(150) NOT NULL,
    password_hash     TEXT         NOT NULL,      -- nunca guardar la contraseña en claro, solo el hash (bcrypt/argon2)
    nombre            VARCHAR(100) NOT NULL,
    apellido_paterno  VARCHAR(100) NOT NULL,
    apellido_materno  VARCHAR(100),
    telefono          VARCHAR(20),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,  -- así se da de baja una cuenta sin borrar su historial
    fecha_creacion    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- email único sin importar mayúsculas
CREATE UNIQUE INDEX uq_usuarios_email ON core.usuarios (lower(email));

-- Los 4 roles: ESTUDIANTE, OFERTADOR, ADMIN, SUPERADMIN (se cargan al final)
CREATE TABLE core.roles (
    id_rol      SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave       VARCHAR(30) NOT NULL UNIQUE,
    nombre      VARCHAR(60) NOT NULL,
    descripcion TEXT
);

-- Subroles: por ahora solo los usa ADMIN (académico y documental),
-- pero la tabla sirve para cualquier rol que ocupe dividirse después.
CREATE TABLE core.subroles (
    id_subrol   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol      SMALLINT    NOT NULL REFERENCES core.roles (id_rol),
    clave       VARCHAR(30) NOT NULL UNIQUE,
    nombre      VARCHAR(60) NOT NULL,
    descripcion TEXT,
    UNIQUE (id_subrol, id_rol)   -- lo pide la FK compuesta de usuario_roles
);

CREATE TABLE core.usuario_roles (
    id_usuario   BIGINT   NOT NULL REFERENCES core.usuarios (id_usuario) ON DELETE CASCADE,
    id_rol       SMALLINT NOT NULL REFERENCES core.roles (id_rol),
    id_subrol    SMALLINT,
    asignado_por BIGINT REFERENCES core.usuarios (id_usuario),
    asignado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_usuario, id_rol),
    -- con esta FK compuesta el subrol siempre tiene que ser del rol que se le puso
    FOREIGN KEY (id_subrol, id_rol) REFERENCES core.subroles (id_subrol, id_rol)
);

-- Módulos del sistema. Hoy solo existe PRACTICAS.
CREATE TABLE core.modulos (
    id_modulo   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave       VARCHAR(40)  NOT NULL UNIQUE,
    nombre      VARCHAR(100) NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE core.permisos (
    id_permiso  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_modulo   SMALLINT     NOT NULL REFERENCES core.modulos (id_modulo),
    clave       VARCHAR(80)  NOT NULL UNIQUE,   -- formato modulo.recurso.accion
    descripcion TEXT
);

-- permisos que trae un rol completo
CREATE TABLE core.rol_permisos (
    id_rol     SMALLINT NOT NULL REFERENCES core.roles (id_rol) ON DELETE CASCADE,
    id_permiso INT      NOT NULL REFERENCES core.permisos (id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

-- permisos extra que trae un subrol (lo que separa al académico del documental)
CREATE TABLE core.subrol_permisos (
    id_subrol  SMALLINT NOT NULL REFERENCES core.subroles (id_subrol) ON DELETE CASCADE,
    id_permiso INT      NOT NULL REFERENCES core.permisos (id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_subrol, id_permiso)
);
--tabla nueva de periodos académicos, para que las prácticas puedan ligarse a un periodo y así poder filtrar por año/semestre
CREATE TABLE core.tipos_periodo (
    id_tipo_periodo   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave             VARCHAR(20) NOT NULL UNIQUE,
    nombre            VARCHAR(40) NOT NULL,
    periodos_por_anio SMALLINT    NOT NULL CHECK (periodos_por_anio BETWEEN 1 AND 12)
);

CREATE TABLE core.carreras (
    id_carrera               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_carrera           VARCHAR(120) NOT NULL UNIQUE,
    id_tipo_periodo          SMALLINT NOT NULL REFERENCES core.tipos_periodo (id_tipo_periodo),
    total_periodos           SMALLINT NOT NULL CHECK (total_periodos > 0), --como en nuestra carrera que dura 9 semestres
    periodo_minimo_practicas SMALLINT NOT NULL CHECK (periodo_minimo_practicas > 0),-- le dice cuando en que periodo puede empezar a hacer practicas
    activa                   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_carrera_minimo CHECK (periodo_minimo_practicas <= total_periodos)
);

CREATE TABLE core.ciclos_escolares (
    id_ciclo        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_periodo SMALLINT    NOT NULL REFERENCES core.tipos_periodo (id_tipo_periodo),
    clave           VARCHAR(20) NOT NULL,
    fecha_inicio    DATE        NOT NULL,
    fecha_fin       DATE        NOT NULL,
    UNIQUE (id_tipo_periodo, clave),
    CONSTRAINT chk_ciclo_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT ex_ciclo_sin_traslape EXCLUDE USING gist (
        id_tipo_periodo WITH =,
        daterange(fecha_inicio, fecha_fin, '[]') WITH &&
    )
);
-- Datos académicos del alumno. Con esto se arma la carta de presentación.

CREATE TABLE core.alumnos (
    id_alumno  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT      NOT NULL UNIQUE REFERENCES core.usuarios (id_usuario),
    matricula  VARCHAR(30) NOT NULL UNIQUE,
    id_carrera INT         NOT NULL REFERENCES core.carreras (id_carrera),
    grupo VARCHAR(20) NOT NULL
);

CREATE TABLE core.alumno_inscripciones (
    id_alumno      BIGINT   NOT NULL REFERENCES core.alumnos (id_alumno),
    id_ciclo       INT      NOT NULL REFERENCES core.ciclos_escolares (id_ciclo),
    numero_periodo SMALLINT NOT NULL CHECK (numero_periodo > 0),
    grupo          VARCHAR(10),
    PRIMARY KEY (id_alumno, id_ciclo)
);

-- Notificaciones internas. Está en core y no en practicas para que
-- cualquier módulo futuro la pueda usar.
CREATE TABLE core.notificaciones (
    id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario      BIGINT      NOT NULL REFERENCES core.usuarios (id_usuario) ON DELETE CASCADE,
    id_modulo       SMALLINT REFERENCES core.modulos (id_modulo),
    tipo            VARCHAR(40) NOT NULL,      -- ej. BITACORA_RECORDATORIO, ACEPTACION_NUEVA
    titulo          VARCHAR(150) NOT NULL,
    mensaje         TEXT,
    entidad         VARCHAR(40),               -- a qué tabla/cosa se refiere (practica, carta, baja...)
    id_entidad      BIGINT,
    leida           BOOLEAN     NOT NULL DEFAULT FALSE,
    creada_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_usuario ON core.notificaciones (id_usuario, leida);
CREATE INDEX idx_notif_ref ON core.notificaciones (tipo, entidad, id_entidad);


-- ============================================================
-- PRACTICAS: catálogos
-- ============================================================

-- "Por horas" o "por contrato/proyecto". Si horas_requeridas trae valor,
-- ese tipo se cierra por horas; si es NULL se cierra cuando el ofertador
-- marca el proyecto como completado. Así una modalidad nueva es solo un insert.
CREATE TABLE practicas.tipos_practica (
    id_tipo_practica SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave            VARCHAR(30)  NOT NULL UNIQUE,
    nombre           VARCHAR(80)  NOT NULL,
    descripcion      TEXT,
    horas_requeridas INT CHECK (horas_requeridas IS NULL OR horas_requeridas > 0),
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE practicas.categorias_incidencia (
    id_categoria SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave        VARCHAR(30) NOT NULL UNIQUE,
    nombre       VARCHAR(80) NOT NULL,
    activa       BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- PRACTICAS: ofertadores y vacantes
-- ============================================================

CREATE TABLE practicas.empresas (
    id_empresa       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    direccion        VARCHAR(255),
    telefono         VARCHAR(30),
    correo           VARCHAR(150),
    contacto_nombre  VARCHAR(150),
    contacto_puesto  VARCHAR(100),
    activa           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Un ofertador es una empresa externa o un profesor interno.
-- Si es externo tiene que traer empresa, si es interno no.
CREATE TABLE practicas.ofertadores (
    id_ofertador  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario    BIGINT NOT NULL UNIQUE REFERENCES core.usuarios (id_usuario),
    tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('EXTERNO', 'INTERNO')),
    id_empresa    BIGINT REFERENCES practicas.empresas (id_empresa),
    puesto        VARCHAR(100),
    registrado_por BIGINT REFERENCES core.usuarios (id_usuario),  -- quien lo dio de alta (hoy solo el superadmin)
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ofertador_empresa CHECK (
        (tipo = 'EXTERNO' AND id_empresa IS NOT NULL) OR
        (tipo = 'INTERNO' AND id_empresa IS NULL)
    )
);
-- Ojo: no forcé en la BD que registrado_por sea superadmin porque en el
-- doc quedó pendiente si alguien más podrá dar de alta ofertadores.

CREATE TABLE practicas.vacantes (
    id_vacante        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ofertador      BIGINT   NOT NULL REFERENCES practicas.ofertadores (id_ofertador),
    id_tipo_practica  SMALLINT NOT NULL REFERENCES practicas.tipos_practica (id_tipo_practica),
    titulo            VARCHAR(200) NOT NULL,
    descripcion       TEXT NOT NULL,
    requisitos        TEXT,
    modalidad_trabajo VARCHAR(12) CHECK (modalidad_trabajo IN ('PRESENCIAL', 'REMOTO', 'MIXTO')),
    cupo_total        INT NOT NULL CHECK (cupo_total > 0),
    cupo_disponible   INT NOT NULL,   -- lo llena un trigger al insertar; baja al confirmarse una práctica
    estado            VARCHAR(10) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA', 'CANCELADA')),
    publicada_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cierra_en         TIMESTAMPTZ,
    CONSTRAINT chk_cupo CHECK (cupo_disponible BETWEEN 0 AND cupo_total)
);
CREATE INDEX idx_vacantes_abiertas ON practicas.vacantes (estado) WHERE estado = 'ABIERTA';


-- ============================================================
-- PRACTICAS: carta de presentación
-- ============================================================

-- Flujo: GENERADA (el sistema se la da al alumno) -> ESCANEO_SUBIDO
-- (ya la imprimió, la selló y subió el escaneo) -> APROBADA o RECHAZADA
-- (la revisa el admin documental). Si la rechazan se genera una nueva fila.
CREATE TABLE practicas.cartas_presentacion (
    id_carta          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alumno         BIGINT NOT NULL REFERENCES core.alumnos (id_alumno),
    -- foto de los datos al momento de generarla (nombre, matrícula, carrera, semestre...)
    -- va en jsonb para que se puedan agregar campos a la carta sin migrar la tabla
    datos             JSONB NOT NULL,
    generada_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ruta_escaneo      TEXT,          -- guardamos la ruta del archivo, no el binario
    escaneo_subido_en TIMESTAMPTZ,
    estado            VARCHAR(15) NOT NULL DEFAULT 'GENERADA'
                      CHECK (estado IN ('GENERADA', 'ESCANEO_SUBIDO', 'APROBADA', 'RECHAZADA')),
    revisada_por      BIGINT REFERENCES core.usuarios (id_usuario),
    revisada_en       TIMESTAMPTZ,
    comentarios       TEXT,
    CONSTRAINT chk_carta_escaneo   CHECK (estado = 'GENERADA' OR ruta_escaneo IS NOT NULL),
    CONSTRAINT chk_carta_revision  CHECK (estado NOT IN ('APROBADA', 'RECHAZADA') OR (revisada_por IS NOT NULL AND revisada_en IS NOT NULL)),
    CONSTRAINT chk_carta_rechazo   CHECK (estado <> 'RECHAZADA' OR comentarios IS NOT NULL)  -- si rechazan, que digan por qué
);
-- solo una carta aprobada por alumno
CREATE UNIQUE INDEX uq_carta_aprobada ON practicas.cartas_presentacion (id_alumno) WHERE estado = 'APROBADA';
CREATE INDEX idx_cartas_alumno ON practicas.cartas_presentacion (id_alumno);


-- ============================================================
-- PRACTICAS: postulación -> aceptación -> práctica
-- ============================================================

CREATE TABLE practicas.postulaciones (
    id_postulacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vacante     BIGINT NOT NULL REFERENCES practicas.vacantes (id_vacante),
    id_alumno      BIGINT NOT NULL REFERENCES core.alumnos (id_alumno),
    postulada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado         VARCHAR(25) NOT NULL DEFAULT 'POSTULADA'
                   CHECK (estado IN ('POSTULADA', 'NO_SELECCIONADA', 'RETIRADA', 'ACEPTADA', 'CERRADA_POR_CONFIRMACION')),
    UNIQUE (id_vacante, id_alumno)     -- no postularse dos veces a la misma vacante
);
CREATE INDEX idx_postulaciones_alumno ON practicas.postulaciones (id_alumno);

-- Cuando el ofertador acepta a alguien se crea una fila aquí.
-- Salidas posibles (ninguna se queda colgada):
--   CONFIRMADA, RECHAZADA_ALUMNO, CANCELADA_OFERTADOR, EXPIRADA (48 h),
--   CERRADA_POR_CONFIRMACION (el alumno confirmó otra)
CREATE TABLE practicas.aceptaciones (
    id_aceptacion  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_postulacion BIGINT NOT NULL UNIQUE REFERENCES practicas.postulaciones (id_postulacion),
    aceptada_por   BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),   -- el usuario ofertador
    aceptada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
    estado         VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE'
                   CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA_ALUMNO', 'CANCELADA_OFERTADOR',
                                     'EXPIRADA', 'CERRADA_POR_CONFIRMACION')),
    resuelta_en    TIMESTAMPTZ,
    CONSTRAINT chk_aceptacion_resuelta CHECK ((estado = 'PENDIENTE') = (resuelta_en IS NULL))
);
CREATE INDEX idx_aceptaciones_pendientes ON practicas.aceptaciones (expira_en) WHERE estado = 'PENDIENTE';

-- La práctica en sí. Nace cuando el alumno confirma una aceptación.
-- Que exista una fila ACTIVA es lo que "enciende" tareas y bitácora
-- (esas tablas cuelgan de aquí).
CREATE TABLE practicas.practica_alumno (
    id_practica         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_aceptacion       BIGINT NOT NULL UNIQUE REFERENCES practicas.aceptaciones (id_aceptacion),
    id_alumno           BIGINT NOT NULL REFERENCES core.alumnos (id_alumno),
    id_vacante          BIGINT NOT NULL REFERENCES practicas.vacantes (id_vacante),
    -- la carta validada que se le compartió al ofertador al confirmar
    id_carta_presentacion BIGINT NOT NULL REFERENCES practicas.cartas_presentacion (id_carta),
    carta_compartida_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
                        CHECK (estado IN ('ACTIVA', 'EN_REVISION_CIERRE', 'CERRADA', 'BAJA')),
    fecha_inicio        DATE NOT NULL DEFAULT current_date,
    fecha_fin           DATE,
    -- cierre por horas: lo pide el alumno
    cierre_solicitado_en  TIMESTAMPTZ,
    cierre_solicitado_por BIGINT REFERENCES core.usuarios (id_usuario),
    -- cierre por proyecto: lo marca el ofertador
    proyecto_completado_en  TIMESTAMPTZ,
    proyecto_completado_por BIGINT REFERENCES core.usuarios (id_usuario),
    -- el cierre siempre lo confirma un admin, nunca es automático
    cerrada_por         BIGINT REFERENCES core.usuarios (id_usuario),
    cerrada_en          TIMESTAMPTZ,
    observaciones_cierre TEXT,
    CONSTRAINT chk_practica_cerrada CHECK (estado <> 'CERRADA' OR (cerrada_por IS NOT NULL AND cerrada_en IS NOT NULL AND fecha_fin IS NOT NULL)),
    CONSTRAINT chk_practica_revision CHECK (estado <> 'EN_REVISION_CIERRE' OR cierre_solicitado_en IS NOT NULL)
);
-- solo una práctica "viva" por alumno. Esto es lo que lo bloquea de postularse a otra.
CREATE UNIQUE INDEX uq_practica_viva ON practicas.practica_alumno (id_alumno)
    WHERE estado IN ('ACTIVA', 'EN_REVISION_CIERRE');

-- La genera el ofertador después de que el alumno confirmó
CREATE TABLE practicas.cartas_aceptacion (
    id_carta_aceptacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_practica  BIGINT NOT NULL UNIQUE REFERENCES practicas.practica_alumno (id_practica),
    generada_por BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),
    datos        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- igual que la otra carta, campos flexibles
    ruta_archivo TEXT,
    generada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- PRACTICAS: tareas y bitácora
-- ============================================================

CREATE TABLE practicas.tareas (
    id_tarea     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_practica  BIGINT NOT NULL REFERENCES practicas.practica_alumno (id_practica),
    creada_por   BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),
    titulo       VARCHAR(200) NOT NULL,
    descripcion  TEXT,
    fecha_limite DATE NOT NULL,
    estado       VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENTREGADA', 'COMPLETADA')),
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_tarea, id_practica)     -- para que la bitácora no pueda ligar tareas de otra práctica
);

CREATE TABLE practicas.tarea_evidencias (
    id_evidencia   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tarea       BIGINT NOT NULL REFERENCES practicas.tareas (id_tarea) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    ruta_relativa  TEXT NOT NULL,
    mime_type      TEXT,
    subido_por     BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),
    subido_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Puede haber varias entradas el mismo día. Cada una puede ligarse a una tarea (opcional).
CREATE TABLE practicas.bitacora (
    id_registro BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_practica BIGINT NOT NULL REFERENCES practicas.practica_alumno (id_practica),
    fecha       DATE NOT NULL DEFAULT current_date,
    descripcion TEXT NOT NULL,
    horas       NUMERIC(4,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
    id_tarea    BIGINT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (id_tarea, id_practica) REFERENCES practicas.tareas (id_tarea, id_practica)
);
CREATE INDEX idx_bitacora_practica ON practicas.bitacora (id_practica, fecha);


-- ============================================================
-- PRACTICAS: incidencias y bajas
-- ============================================================

-- Las categorías salen del catálogo, pero si el ofertador quiere reportar
-- algo que no está, escribe la suya en categoria_libre.
CREATE TABLE practicas.incidencias (
    id_incidencia   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_practica     BIGINT NOT NULL REFERENCES practicas.practica_alumno (id_practica),
    reportada_por   BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),
    id_categoria    SMALLINT REFERENCES practicas.categorias_incidencia (id_categoria),
    categoria_libre VARCHAR(150),
    descripcion     TEXT NOT NULL,
    fecha_hecho     DATE NOT NULL DEFAULT current_date,
    registrada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado          VARCHAR(10) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'RESUELTA')),
    atendida_por    BIGINT REFERENCES core.usuarios (id_usuario),
    resolucion      TEXT,
    resuelta_en     TIMESTAMPTZ,
    CONSTRAINT chk_incidencia_categoria CHECK (id_categoria IS NOT NULL OR categoria_libre IS NOT NULL),
    CONSTRAINT chk_incidencia_resuelta CHECK (estado <> 'RESUELTA' OR (atendida_por IS NOT NULL AND resolucion IS NOT NULL AND resuelta_en IS NOT NULL))
);
CREATE INDEX idx_incidencias_practica ON practicas.incidencias (id_practica);

-- Recorrido de una baja:
--   EN_REVISION_ACADEMICA -> el admin académico habla con el alumno
--       -> RESUELTA_SIN_BAJA (se arregló) o ESCALADA (no se pudo)
--   ESCALADA -> solo el superadmin decide: APROBADA o RECHAZADA
CREATE TABLE practicas.solicitudes_baja (
    id_solicitud    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_practica     BIGINT NOT NULL REFERENCES practicas.practica_alumno (id_practica),
    id_incidencia   BIGINT REFERENCES practicas.incidencias (id_incidencia),  -- opcional, si nace de una incidencia
    solicitada_por  BIGINT NOT NULL REFERENCES core.usuarios (id_usuario),
    motivo          TEXT NOT NULL,
    solicitada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado          VARCHAR(25) NOT NULL DEFAULT 'EN_REVISION_ACADEMICA'
                    CHECK (estado IN ('EN_REVISION_ACADEMICA', 'RESUELTA_SIN_BAJA', 'ESCALADA', 'APROBADA', 'RECHAZADA')),
    atendida_por    BIGINT REFERENCES core.usuarios (id_usuario),   -- admin académico
    nota_academica  TEXT,
    escalada_en     TIMESTAMPTZ,
    decidida_por    BIGINT REFERENCES core.usuarios (id_usuario),   -- superadmin
    decidida_en     TIMESTAMPTZ,
    comentario_decision TEXT,
    resuelta_en     TIMESTAMPTZ,
    CONSTRAINT chk_baja_academico CHECK (estado = 'EN_REVISION_ACADEMICA' OR atendida_por IS NOT NULL),
    CONSTRAINT chk_baja_escalada  CHECK (estado <> 'ESCALADA' OR escalada_en IS NOT NULL),
    CONSTRAINT chk_baja_decision  CHECK (estado NOT IN ('APROBADA', 'RECHAZADA') OR (decidida_por IS NOT NULL AND decidida_en IS NOT NULL))
);
-- una sola solicitud abierta por práctica
CREATE UNIQUE INDEX uq_baja_abierta ON practicas.solicitudes_baja (id_practica)
    WHERE estado IN ('EN_REVISION_ACADEMICA', 'ESCALADA');


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


-- ============================================================
-- TRIGGERS: usuarios / roles
-- ============================================================

-- si el rol tiene subroles definidos (como ADMIN) es obligatorio elegir uno
CREATE OR REPLACE FUNCTION core.fn_exigir_subrol()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_subrol IS NULL
       AND EXISTS (SELECT 1 FROM core.subroles WHERE id_rol = NEW.id_rol) THEN
        RAISE EXCEPTION 'Ese rol necesita un subrol (por ejemplo ADMIN_ACADEMICO o ADMIN_DOCUMENTAL)';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_exigir_subrol
BEFORE INSERT OR UPDATE ON core.usuario_roles
FOR EACH ROW EXECUTE FUNCTION core.fn_exigir_subrol();


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


-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO core.roles (clave, nombre, descripcion) VALUES
    ('ESTUDIANTE', 'Estudiante',         'Ve vacantes, se postula, confirma su práctica y lleva su bitácora'),
    ('OFERTADOR',  'Ofertador',          'Empresa externa o profesor interno que publica vacantes y supervisa alumnos'),
    ('ADMIN',      'Administrador',      'Supervisión del módulo; se divide en subroles'),
    ('SUPERADMIN', 'Superadministrador', 'Director: todo lo del admin, más ofertadores, bajas y cuentas de admin');

INSERT INTO core.subroles (id_rol, clave, nombre, descripcion)
SELECT r.id_rol, s.clave, s.nombre, s.descripcion
FROM core.roles r
JOIN (VALUES
    ('ADMIN_ACADEMICO',  'Administrador Académico (catedrático)',
        'Profesor de la materia de Prácticas: supervisa avances y bitácoras, atiende incidencias y bajas primero'),
    ('ADMIN_DOCUMENTAL', 'Administrador Documental (administrativo)',
        'Personal administrativo: aprueba o rechaza cartas y lleva el expediente')
) AS s(clave, nombre, descripcion) ON r.clave = 'ADMIN';

INSERT INTO core.modulos (clave, nombre) VALUES ('PRACTICAS', 'Prácticas y Residencias Profesionales');

INSERT INTO core.permisos (id_modulo, clave, descripcion)
SELECT m.id_modulo, p.clave, p.descripcion
FROM core.modulos m
JOIN (VALUES
    ('practicas.carta.generar',            'Generar y subir su carta de presentación'),
    ('practicas.vacantes.ver',             'Ver vacantes y postularse'),
    ('practicas.bitacora.registrar',       'Registrar bitácora propia'),
    ('practicas.vacantes.publicar',        'Publicar y administrar vacantes propias'),
    ('practicas.aceptaciones.gestionar',   'Aceptar/cancelar alumnos y generar carta de aceptación'),
    ('practicas.tareas.delegar',           'Delegar tareas a alumnos en práctica'),
    ('practicas.incidencias.registrar',    'Registrar incidencias y solicitar bajas'),
    ('practicas.proyecto.completar',       'Marcar un proyecto por contrato como completado'),
    ('practicas.alumnos.ver_todos',        'Ver a todos los alumnos, avances y bitácoras'),
    ('practicas.cierres.confirmar',        'Confirmar el cierre de una práctica'),
    ('practicas.cartas.revisar',           'Aprobar o rechazar cartas de presentación'),
    ('practicas.incidencias.atender',      'Atender incidencias y bajas en primera instancia'),
    ('practicas.bajas.decidir',            'Aprobar o rechazar bajas de forma definitiva'),
    ('practicas.ofertadores.registrar',    'Dar de alta ofertadores'),
    ('practicas.cuentas_admin.gestionar',  'Alta y baja de cuentas de administrador')
) AS p(clave, descripcion) ON m.clave = 'PRACTICAS';

-- permisos por rol
INSERT INTO core.rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM (VALUES
    ('ESTUDIANTE', 'practicas.carta.generar'),
    ('ESTUDIANTE', 'practicas.vacantes.ver'),
    ('ESTUDIANTE', 'practicas.bitacora.registrar'),
    ('OFERTADOR',  'practicas.vacantes.publicar'),
    ('OFERTADOR',  'practicas.aceptaciones.gestionar'),
    ('OFERTADOR',  'practicas.tareas.delegar'),
    ('OFERTADOR',  'practicas.incidencias.registrar'),
    ('OFERTADOR',  'practicas.proyecto.completar'),
    ('ADMIN',      'practicas.alumnos.ver_todos'),
    ('ADMIN',      'practicas.cierres.confirmar')
) AS x(rol, permiso)
JOIN core.roles r ON r.clave = x.rol
JOIN core.permisos p ON p.clave = x.permiso;

-- lo que separa a un subrol del otro
INSERT INTO core.subrol_permisos (id_subrol, id_permiso)
SELECT s.id_subrol, p.id_permiso
FROM (VALUES
    ('ADMIN_DOCUMENTAL', 'practicas.cartas.revisar'),
    ('ADMIN_ACADEMICO',  'practicas.incidencias.atender')
) AS x(subrol, permiso)
JOIN core.subroles s ON s.clave = x.subrol
JOIN core.permisos p ON p.clave = x.permiso;

-- El SUPERADMIN no lleva filas en rol_permisos: fn_tiene_permiso() lo deja
-- pasar siempre. Así, cuando se agregue un módulo, no hay que acordarse
-- de darle permisos nuevos al director.

INSERT INTO practicas.tipos_practica (clave, nombre, descripcion, horas_requeridas) VALUES
    ('HORAS',    'Por horas',              'Se concluye al llegar a las horas requeridas', 240),
    ('PROYECTO', 'Por contrato / proyecto', 'Se concluye cuando el ofertador marca el proyecto como entregado', NULL);

INSERT INTO practicas.categorias_incidencia (clave, nombre) VALUES
    ('FALTAS',           'Faltas'),
    ('BAJO_DESEMPENO',   'Bajo desempeño'),
    ('CONDUCTA',         'Conducta inapropiada');
-- Si el ofertador quiere reportar otra cosa, usa incidencias.categoria_libre.
-- Categorías nuevas: solo un INSERT más aquí.
