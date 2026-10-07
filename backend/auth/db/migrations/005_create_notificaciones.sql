-- 005_create_notificaciones.sql
-- Notificaciones internas

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
