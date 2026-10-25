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

-- ============================================================
-- USUARIOS DE PRUEBA (SOLO DESARROLLO)
-- ============================================================
-- Uno por rol/subrol. Todos usan la contraseña "SigeaDev2026!"
-- (hash bcrypt, costo 10). Ver README. No correr este seed en producción.
INSERT INTO core.usuarios (username, email, password_hash, nombre, apellido_paterno) VALUES
    ('estudiante.prueba',  'estudiante@sigea.test',  '$2b$10$ndIBIIEs7NHY6.cJyu3SoOB1Ha605WCYXLm6Vvi7cBC732KUB3/fy', 'Estudiante', 'Prueba'),
    ('ofertador.prueba',   'ofertador@sigea.test',   '$2b$10$ndIBIIEs7NHY6.cJyu3SoOB1Ha605WCYXLm6Vvi7cBC732KUB3/fy', 'Ofertador', 'Prueba'),
    ('academico.prueba',   'academico@sigea.test',   '$2b$10$ndIBIIEs7NHY6.cJyu3SoOB1Ha605WCYXLm6Vvi7cBC732KUB3/fy', 'Admin Académico', 'Prueba'),
    ('documental.prueba',  'documental@sigea.test',  '$2b$10$ndIBIIEs7NHY6.cJyu3SoOB1Ha605WCYXLm6Vvi7cBC732KUB3/fy', 'Admin Documental', 'Prueba'),
    ('superadmin.prueba',  'superadmin@sigea.test',  '$2b$10$ndIBIIEs7NHY6.cJyu3SoOB1Ha605WCYXLm6Vvi7cBC732KUB3/fy', 'Superadmin', 'Prueba')
ON CONFLICT (username) DO NOTHING;

-- ADMIN siempre lleva subrol (lo exige trg_exigir_subrol)
INSERT INTO core.usuario_roles (id_usuario, id_rol, id_subrol)
SELECT u.id_usuario, r.id_rol, s.id_subrol
FROM (VALUES
    ('estudiante.prueba', 'ESTUDIANTE', NULL),
    ('ofertador.prueba',  'OFERTADOR',  NULL),
    ('academico.prueba',  'ADMIN',      'ADMIN_ACADEMICO'),
    ('documental.prueba', 'ADMIN',      'ADMIN_DOCUMENTAL'),
    ('superadmin.prueba', 'SUPERADMIN', NULL)
) AS x(username, rol, subrol)
JOIN core.usuarios u ON u.username = x.username
JOIN core.roles r ON r.clave = x.rol
LEFT JOIN core.subroles s ON s.clave = x.subrol
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

-- ============================================================
-- CATÁLOGOS ACADÉMICOS Y PERFILES DE PRUEBA (SOLO DESARROLLO)
-- ============================================================
-- Hay carreras semestrales y cuatrimestrales: cada carrera apunta a su tipo de
-- periodo y cada tipo tiene sus propios ciclos (los de un tipo no se traslapan).
INSERT INTO core.tipos_periodo (clave, nombre, periodos_por_anio) VALUES
    ('SEMESTRE', 'Semestre', 2),
    ('CUATRIMESTRE', 'Cuatrimestre', 3)
ON CONFLICT (clave) DO UPDATE
SET nombre = EXCLUDED.nombre, periodos_por_anio = EXCLUDED.periodos_por_anio;

INSERT INTO core.carreras (nombre_carrera, id_tipo_periodo, total_periodos, periodo_minimo_practicas)
SELECT c.nombre, tp.id_tipo_periodo, c.total, c.minimo
FROM (VALUES
    ('Ingeniería en Sistemas Computacionales', 'SEMESTRE', 9, 6),
    ('Licenciatura en Administración', 'SEMESTRE', 8, 6),
    ('Ingeniería en Tecnologías de la Información', 'CUATRIMESTRE', 10, 7),
    ('Licenciatura en Gestión Empresarial', 'CUATRIMESTRE', 10, 7)
) AS c(nombre, tipo, total, minimo)
JOIN core.tipos_periodo tp ON tp.clave = c.tipo
ON CONFLICT (nombre_carrera) DO NOTHING;

INSERT INTO core.ciclos_escolares (id_tipo_periodo, clave, fecha_inicio, fecha_fin)
SELECT tp.id_tipo_periodo, c.clave, c.inicio::date, c.fin::date
FROM (VALUES
    ('SEMESTRE', '2026-2', '2026-08-01', '2026-12-31'),
    ('SEMESTRE', '2027-1', '2027-01-15', '2027-06-30'),
    ('CUATRIMESTRE', '2026-C3', '2026-09-01', '2026-12-18'),
    ('CUATRIMESTRE', '2027-C1', '2027-01-06', '2027-04-23'),
    ('CUATRIMESTRE', '2027-C2', '2027-05-03', '2027-08-20')
) AS c(tipo, clave, inicio, fin)
JOIN core.tipos_periodo tp ON tp.clave = c.tipo
ON CONFLICT (id_tipo_periodo, clave) DO NOTHING;

INSERT INTO core.alumnos (id_usuario, matricula, id_carrera, grupo)
SELECT u.id_usuario, 'A0000001', c.id_carrera, '7A'
FROM core.usuarios u
JOIN core.carreras c ON c.nombre_carrera = 'Ingeniería en Sistemas Computacionales'
WHERE u.username = 'estudiante.prueba'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO core.alumno_inscripciones (id_alumno, id_ciclo, numero_periodo, grupo)
SELECT a.id_alumno, ce.id_ciclo, 7, '7A'
FROM core.alumnos a
JOIN core.usuarios u ON u.id_usuario = a.id_usuario AND u.username = 'estudiante.prueba'
JOIN core.ciclos_escolares ce ON ce.clave = '2026-2'
ON CONFLICT (id_alumno, id_ciclo) DO NOTHING;

INSERT INTO practicas.empresas (nombre, descripcion, direccion, telefono, correo, contacto_nombre, contacto_puesto)
SELECT 'Empresa de Prueba S.A. de C.V.', 'Empresa ficticia para desarrollo',
       'Av. Central 100, Tuxtla Gutiérrez, Chis.', '9610000000', 'contacto@empresa.test',
       'Ofertador Prueba', 'Gerente de TI'
WHERE NOT EXISTS (SELECT 1 FROM practicas.empresas WHERE nombre = 'Empresa de Prueba S.A. de C.V.');

INSERT INTO practicas.ofertadores (id_usuario, tipo, id_empresa, puesto, registrado_por)
SELECT u.id_usuario, 'EXTERNO', e.id_empresa, 'Gerente de TI', sa.id_usuario
FROM core.usuarios u
JOIN practicas.empresas e ON e.nombre = 'Empresa de Prueba S.A. de C.V.'
LEFT JOIN core.usuarios sa ON sa.username = 'superadmin.prueba'
WHERE u.username = 'ofertador.prueba'
ON CONFLICT (id_usuario) DO NOTHING;
