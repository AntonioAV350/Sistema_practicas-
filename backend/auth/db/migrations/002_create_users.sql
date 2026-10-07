-- 002_create_users.sql
-- Usuarios, asignación de roles a usuarios y su trigger de validación

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

