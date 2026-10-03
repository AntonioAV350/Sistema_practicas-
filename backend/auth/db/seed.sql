-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO core.roles (clave, nombre, descripcion) VALUES
    ('ESTUDIANTE', 'Estudiante',
        'Ve vacantes, se postula, confirma su práctica y lleva su bitácora'),
    ('OFERTADOR', 'Ofertador',
        'Empresa externa o profesor interno que publica vacantes y supervisa alumnos'),
    ('ADMIN', 'Administrador',
        'Supervisión del módulo; se divide en subroles'),
    ('SUPERADMIN', 'Superadministrador',
        'Director: todo lo del admin, más ofertadores, bajas y cuentas de admin')
ON CONFLICT (clave) DO UPDATE
SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion;


INSERT INTO core.subroles (id_rol, clave, nombre, descripcion)
SELECT r.id_rol, s.clave, s.nombre, s.descripcion
FROM core.roles r
JOIN (VALUES
    ('ADMIN_ACADEMICO', 'Administrador Académico (catedrático)',
        'Profesor de la materia de Prácticas: supervisa avances y bitácoras, atiende incidencias y bajas primero'),
    ('ADMIN_DOCUMENTAL', 'Administrador Documental (administrativo)',
        'Personal administrativo: aprueba o rechaza cartas y lleva el expediente')
) AS s(clave, nombre, descripcion)
    ON r.clave = 'ADMIN'
ON CONFLICT (clave) DO UPDATE
SET
    id_rol = EXCLUDED.id_rol,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion;

INSERT INTO core.modulos (clave, nombre) VALUES ('PRACTICAS', 'Prácticas y Residencias Profesionales') ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO core.permisos (id_modulo, clave, descripcion)
SELECT m.id_modulo, p.clave, p.descripcion
FROM core.modulos m
JOIN (VALUES
    ('practicas.carta.generar', 'Generar y subir su carta de presentación'),
    ('practicas.vacantes.ver', 'Ver vacantes y postularse'),
    ('practicas.bitacora.registrar', 'Registrar bitácora propia'),
    ('practicas.vacantes.publicar', 'Publicar y administrar vacantes propias'),
    ('practicas.aceptaciones.gestionar', 'Aceptar/cancelar alumnos y generar carta de aceptación'),
    ('practicas.tareas.delegar', 'Delegar tareas a alumnos en práctica'),
    ('practicas.incidencias.registrar', 'Registrar incidencias y solicitar bajas'),
    ('practicas.proyecto.completar', 'Marcar un proyecto por contrato como completado'),
    ('practicas.alumnos.ver_todos', 'Ver a todos los alumnos, avances y bitácoras'),
    ('practicas.cierres.confirmar', 'Confirmar el cierre de una práctica'),
    ('practicas.cartas.revisar', 'Aprobar o rechazar cartas de presentación'),
    ('practicas.incidencias.atender', 'Atender incidencias y bajas en primera instancia'),
    ('practicas.bajas.decidir', 'Aprobar o rechazar bajas de forma definitiva'),
    ('practicas.ofertadores.registrar', 'Dar de alta ofertadores'),
    ('practicas.cuentas_admin.gestionar', 'Alta y baja de cuentas de administrador')
) AS p(clave, descripcion)  ON m.clave = 'PRACTICAS'
ON CONFLICT (clave) DO UPDATE
SET
    id_modulo = EXCLUDED.id_modulo,
    descripcion = EXCLUDED.descripcion;


-- permisos por rol
INSERT INTO core.rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM (VALUES
    ('ESTUDIANTE', 'practicas.carta.generar'),
    ('ESTUDIANTE', 'practicas.vacantes.ver'),
    ('ESTUDIANTE', 'practicas.bitacora.registrar'),
    ('OFERTADOR', 'practicas.vacantes.publicar'),
    ('OFERTADOR', 'practicas.aceptaciones.gestionar'),
    ('OFERTADOR', 'practicas.tareas.delegar'),
    ('OFERTADOR', 'practicas.incidencias.registrar'),
    ('OFERTADOR', 'practicas.proyecto.completar'),
    ('ADMIN', 'practicas.alumnos.ver_todos'),
    ('ADMIN', 'practicas.cierres.confirmar')
) AS x(rol, permiso)
JOIN core.roles r ON r.clave = x.rol
JOIN core.permisos p ON p.clave = x.permiso
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- lo que separa a un subrol del otro

INSERT INTO core.subrol_permisos (id_subrol, id_permiso)
SELECT s.id_subrol, p.id_permiso
FROM (VALUES
    ('ADMIN_DOCUMENTAL', 'practicas.cartas.revisar'),
    ('ADMIN_ACADEMICO', 'practicas.incidencias.atender')
) AS x(subrol, permiso)
JOIN core.subroles s ON s.clave = x.subrol
JOIN core.permisos p ON p.clave = x.permiso
ON CONFLICT (id_subrol, id_permiso) DO NOTHING;

-- El SUPERADMIN no lleva filas en rol_permisos: fn_tiene_permiso() lo deja
-- pasar siempre. Así, cuando se agregue un módulo, no hay que acordarse
-- de darle permisos nuevos al director.
INSERT INTO practicas.tipos_practica
    (clave, nombre, descripcion, horas_requeridas) VALUES
    ('HORAS','Por horas','Se concluye al llegar a las horas requeridas',240),
    ('PROYECTO','Por contrato / proyecto','Se concluye cuando el ofertador marca el proyecto como entregado', NULL)
ON CONFLICT (clave) DO UPDATE
SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    horas_requeridas = EXCLUDED.horas_requeridas;

INSERT INTO practicas.categorias_incidencia (clave, nombre) VALUES
    ('FALTAS', 'Faltas'),
    ('BAJO_DESEMPENO', 'Bajo desempeño'),
    ('CONDUCTA', 'Conducta inapropiada')
ON CONFLICT (clave) DO UPDATE
SET
    nombre = EXCLUDED.nombre;

-- Si el ofertador quiere reportar otra cosa, usa incidencias.categoria_libre.
-- Categorías nuevas: solo un INSERT más aquí.
