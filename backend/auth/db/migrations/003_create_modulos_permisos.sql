-- 003_create_modulos_permisos.sql
-- Módulos y permisos (por rol y por subrol)

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
