-- 006_create_practicas_tablas.sql
-- Módulo Prácticas: tablas e índices

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

