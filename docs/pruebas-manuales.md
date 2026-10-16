# Pruebas manuales por rol (SIGEA-21)

**Preparación:** base vacía, `npm run db:migrate -w backend`, `npm run db:seed -w backend`, backend (`npm run dev -w backend`) y frontend (`npm run dev -w frontend`). Las cuentas de prueba están en el README; todas usan la contraseña `SigeaDev2026!`.

## 1. Acceso

- [ ] Login correcto con cada usuario de prueba: cada uno llega a su panel (`/alumno`, `/ofertador`, `/admin`, `/superadmin`).
- [ ] Contraseña incorrecta: aparece "Correo o contraseña incorrectos".
- [ ] Cuenta desactivada por el superadmin: aparece "Tu cuenta está desactivada".
- [ ] Escribir en la URL una ruta de otro rol (por ejemplo `/admin` siendo alumno) te regresa a tu panel.
- [ ] Admin Documental no ve "Cierres", "Incidencias" ni "Bajas"; Admin Académico no ve "Cartas por revisar".
- [ ] API sin token: responde 401 `TOKEN_MISSING`. API con rol ajeno: responde 403 `FORBIDDEN`.

## 2. Cuentas (superadmin)

- [ ] Crear una empresa.
- [ ] Crear un ofertador externo con esa empresa, y uno interno sin empresa.
- [ ] Crear un admin académico y un admin documental.
- [ ] Usar un correo repetido: aparece "Ese correo ya está registrado".
- [ ] Desactivar y reactivar una cuenta; restablecer una contraseña e iniciar sesión con la nueva.

## 3. Alumno: registro y carta

- [ ] `/registro` crea la cuenta e inicia sesión. Una matrícula o un correo repetidos dan error claro.
- [ ] "Mis datos": con un periodo menor al mínimo de la carrera no deja generar la carta.
- [ ] Generar la carta y descargar el PDF con los datos correctos.
- [ ] Subir el escaneo: rechaza archivos que no sean PDF/JPG/PNG o que pesen más de 5 MB.
- [ ] Admin Documental: la carta aparece en "Por revisar". Rechazarla sin comentario no se permite; con comentario sí.
- [ ] El alumno ve el rechazo y genera una nueva; el Admin Documental la aprueba y el alumno recibe la notificación.

## 4. Vacantes, postulación y 48 h

- [ ] El ofertador publica una vacante con cupo 1.
- [ ] Un alumno sin carta aprobada ve el aviso y el botón "Postularme" está deshabilitado.
- [ ] Un alumno con carta aprobada se postula; el ofertador recibe la notificación. No puede postularse dos veces.
- [ ] El ofertador acepta: el alumno ve la cuenta regresiva de 48 h.
- [ ] Con dos aceptaciones pendientes, el alumno confirma una: la otra queda "Cerrada (confirmó otra)", se crea la práctica y el cupo baja (la vacante se cierra si llega a 0).
- [ ] Expiración: en la BD pon `expira_en` en el pasado y espera ≤5 min (o reinicia el backend). La aceptación queda EXPIRADA y el alumno recibe aviso.
- [ ] Cancelar una vacante cierra sus postulaciones y avisa a los alumnos.

## 5. Seguimiento

- [ ] El ofertador genera la carta de aceptación; el alumno la descarga.
- [ ] El ofertador asigna una tarea; el alumno la entrega con evidencia; el ofertador la devuelve y luego la marca completada.
- [ ] El alumno registra bitácora. No permite fecha futura, fecha anterior al inicio ni más de 24 h en un día.
- [ ] Alertas: con `JOBS_DISABLED` sin poner, el job de las 20:00 manda recordatorio (1 día) y alerta al Admin Académico (3 días). Se puede forzar con `SELECT practicas.sp_revisar_bitacoras();`.
- [ ] Por horas: "Solicitar cierre" está deshabilitado hasta llegar a 240 h; después pasa a "En revisión de cierre".
- [ ] Por proyecto: el ofertador marca "Proyecto completado" y queda en revisión.
- [ ] Admin Académico: "No aprobar" exige observaciones y regresa la práctica a activa; "Cerrar práctica" la concluye y avisa a alumno y ofertador.

## 6. Incidencias y bajas

- [ ] El ofertador registra una incidencia; el Admin Académico la ve en su bandeja y la resuelve; el ofertador recibe aviso.
- [ ] El ofertador solicita una baja; no puede abrir una segunda mientras la primera sigue en curso.
- [ ] Admin Académico: "Resolver sin baja" cierra la solicitud y la práctica sigue activa.
- [ ] Nueva solicitud → Admin Académico la escala → Superadmin la ve en "Bajas escaladas".
- [ ] El Superadmin aprueba: la práctica queda en BAJA, el alumno recibe aviso y puede volver a postularse.
- [ ] Otra solicitud escalada que el Superadmin rechaza: la práctica sigue activa y alumno y ofertador reciben aviso.

## 7. Notificaciones

- [ ] La campana muestra el número de no leídas y se actualiza cada minuto.
- [ ] Al hacer clic en una notificación se marca como leída y lleva a la pantalla correspondiente.
- [ ] "Marcar todas como leídas" pone el contador en 0.
