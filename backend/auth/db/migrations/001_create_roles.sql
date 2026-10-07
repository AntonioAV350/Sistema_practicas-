-- 001_create_roles.sql
-- Esquemas base y catálogo de roles/subroles

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS practicas;

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
