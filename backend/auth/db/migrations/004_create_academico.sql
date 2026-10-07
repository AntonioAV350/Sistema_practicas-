-- 004_create_academico.sql
-- Periodos, carreras, ciclos, alumnos e inscripciones

CREATE EXTENSION IF NOT EXISTS btree_gist;

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
