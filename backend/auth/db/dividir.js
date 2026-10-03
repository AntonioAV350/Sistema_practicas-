const fs = require('fs');
const path = require('path');

const lineas = fs.readFileSync(path.join(__dirname, 'bdSigea.sql'), 'utf8').split('\n');
const L = (a, b) => lineas.slice(a - 1, b).join('\n').replace(/^\n+|\n+$/g, '');

const archivos = {
  'migrations/001_create_roles.sql': ['Esquemas base y catálogo de roles/subroles', [[11, 12], [33, 50]]],
  'migrations/002_create_users.sql': ['Usuarios, asignación de roles a usuarios y su trigger de validación', [[16, 31], [52, 61], [524, 543]]],
  'migrations/003_create_modulos_permisos.sql': ['Módulos y permisos (por rol y por subrol)', [[63, 90]]],
  'migrations/004_create_academico.sql': ['Periodos, carreras, ciclos, alumnos e inscripciones', [[13, 13], [91, 138]]],
  'migrations/005_create_notificaciones.sql': ['Notificaciones internas', [[140, 155]]],
  'migrations/006_create_practicas_tablas.sql': ['Módulo Prácticas: tablas e índices', [[158, 431]]],
  'migrations/007_create_funciones_apoyo.sql': ['Funciones de apoyo (permisos y notificaciones)', [[433, 522]]],
  'migrations/008_create_triggers_practicas.sql': ['Triggers del módulo Prácticas', [[545, 1013]]],
  'migrations/009_create_vistas_y_procedimientos.sql': ['Vistas y procedimientos almacenados', [[1014, 1238]]],
  'seed.sql': ['Datos iniciales (SIGEA-14: pendiente volverlo re-ejecutable con ON CONFLICT)', [[1240, 1324]]],
};

fs.mkdirSync(path.join(__dirname, 'migrations'), { recursive: true });
for (const [ruta, [desc, rangos]] of Object.entries(archivos)) {
  const cuerpo = rangos.map(([a, b]) => L(a, b)).join('\n\n');
  const nombre = path.basename(ruta);
  fs.writeFileSync(path.join(__dirname, ruta), `-- ${nombre}\n-- ${desc}\n\n${cuerpo}\n`, 'utf8');
  console.log('creado', ruta);
}