# Matriz de permisos por rol (SIGEA-20)

Cómo se aplica:

- **Backend.** Cada ruta pasa por `authenticate` (token JWT) y `requireRole(...)`. Después, el servicio valida que el recurso sea del usuario: su carta, su vacante o su práctica.
- **Base de datos.** Los triggers repiten las reglas críticas: solo el Admin Documental aprueba cartas, solo un admin cierra prácticas y solo el Superadmin decide bajas.
- **Superadmin.** Pasa automáticamente donde se pide `ADMIN` o un subrol de `ADMIN`.

Leyenda: ✅ puede · 👁 solo consulta · — no aplica

| Acción | Alumno | Ofertador | Admin Académico | Admin Documental | Superadmin |
|---|---|---|---|---|---|
| Registrarse (auto-registro) | ✅ | — | — | — | — |
| Editar sus datos académicos | ✅ | — | — | — | — |
| Generar carta de presentación / subir escaneo | ✅ | — | — | — | — |
| Aprobar / rechazar cartas | — | — | — | ✅ | ✅ |
| Ver carta de un alumno | propia | de sus practicantes | ✅ | ✅ | ✅ |
| Publicar / editar / cerrar / cancelar vacantes | — | ✅ (propias) | — | — | — |
| Ver vacantes abiertas y postularse | ✅ | — | — | — | — |
| Ver todas las vacantes y postulantes | — | propias | 👁 | 👁 | 👁 |
| Aceptar / no seleccionar / cancelar aceptación | — | ✅ | — | — | — |
| Confirmar o rechazar aceptación (48 h) | ✅ | — | — | — | — |
| Registrar bitácora | ✅ | 👁 | 👁 | 👁 | 👁 |
| Asignar y revisar tareas | — | ✅ | 👁 | 👁 | 👁 |
| Entregar evidencias de tareas | ✅ | 👁 | 👁 | 👁 | 👁 |
| Generar carta de aceptación | — | ✅ | 👁 | 👁 | 👁 |
| Solicitar cierre (por horas) | ✅ | — | — | — | — |
| Marcar proyecto completado (por contrato) | — | ✅ | — | — | — |
| Confirmar cierre o regresar a activa | — | — | ✅ | — | ✅ |
| Registrar incidencias | — | ✅ | — | — | — |
| Resolver incidencias | — | — | ✅ | — | ✅ |
| Solicitar baja | — | ✅ | — | — | — |
| Atender baja (resolver sin baja o escalar) | — | — | ✅ | — | ✅ |
| Aprobar / rechazar baja escalada | — | — | — | — | ✅ |
| Crear cuentas de admin y ofertador, empresas | — | — | — | — | ✅ |
| Activar / desactivar cuentas, restablecer contraseña | — | — | — | — | ✅ |
| Ver alumnos y prácticas de todo el sistema | — | — | 👁 | 👁 | 👁 |
| Notificaciones propias | ✅ | ✅ | ✅ | ✅ | ✅ |

Los permisos finos del seed (`core.permisos`, `rol_permisos` y `subrol_permisos`) corresponden a esta tabla. Por ejemplo, `practicas.cartas.revisar` es exclusivo de ADMIN_DOCUMENTAL y `practicas.incidencias.atender` de ADMIN_ACADEMICO.
