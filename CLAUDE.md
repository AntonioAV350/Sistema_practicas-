# Prompt para Claude Code — Sistema de Prácticas y Residencias

## Contexto y rol

Vas a dejar listo el esqueleto inicial de un **monorepo Node.js + Vue** para un sistema de gestión de prácticas profesionales universitarias. Es una reescritura independiente de un módulo anterior, con su propio login. Aquí el contexto de negocio, resumido a lo que necesitas para nombrar módulos y entidades correctamente (el detalle completo de reglas de negocio vive en este mismo archivo para las siguientes sesiones, no es necesario para el scaffolding):

**Roles del sistema**: Alumno, Ofertador (empresa/profesor), Administrador Académico, Administrador Documental, Superadministrador.

**Entidades/dominios principales**: vacantes, postulaciones/aceptaciones, prácticas activas, cartas de presentación, bitácora de avances, tareas, incidencias, bajas, notificaciones.

**Reglas de negocio para sesiones futuras** (no aplican al scaffolding, consérvalas como contexto):
- Carta de presentación: paso previo obligatorio para seleccionar práctica (generar PDF → alumno lo sella/firma → lo sube → Admin Documental valida).
- Un alumno puede tener varias aceptaciones pendientes a la vez; al confirmar una, las demás se liberan; cada una expira sola a las 48h.
- Avances: modelo combinado — el Ofertador asigna tareas, el Alumno lleva bitácora diaria obligatoria.
- Prácticas "por horas" (240h) o "por contrato"; el cierre siempre lo confirma el Administrador, nunca es automático.
- Bajas: Ofertador solicita → Administrador gestiona → Superadministrador aprueba en definitiva.
- Alertas de bitácora: 1 día sin registrar → recordatorio al Alumno; 3 días → alerta al Administrador.

## Tarea concreta

Genera, dentro de esta carpeta vacía, el esqueleto completo del repo — **sin lógica de negocio, sin endpoints reales, sin conexiones de UI**. Solo estructura, configuración y dependencias.

1. Crea la estructura de carpetas exacta de la sección "Estructura de carpetas" abajo.
2. Crea los `package.json` de la raíz y de cada workspace (`frontend`, `backend`, `shared`), con `npm workspaces` configurado correctamente en el `package.json` raíz.
3. Dentro de cada uno de los 10 módulos backend, crea los 5 archivos de la convención (`routes.js`, `controller.js`, `service.js`, `repository.js`, `validators.js`) como placeholders con el boilerplate mínimo — imports básicos y export vacío, sin lógica.
4. Instala en `backend/`: `express`, `pg`, `zod`, `jsonwebtoken`, `bcrypt`, `multer`, `pdf-lib`, `node-cron`, `dotenv`, `helmet`, `morgan`; como dev dependency, `nodemon`.
5. Instala en `frontend/`: `vue`, `vue-router`, `pinia`, `axios`, `primevue`, `tailwindcss`.
6. Crea un `docker-compose.yml` que levante únicamente un contenedor de PostgreSQL.
7. Crea `.env.example` en la raíz y `.gitignore` cubriendo `node_modules`, `.env`, y artefactos de build.

## Estructura de carpetas

```
sigea-practicas/
├── package.json
├── docker-compose.yml
├── .gitignore
├── .env.example
├── shared/
│   ├── package.json
│   ├── schemas/         # zod: loginSchema, vacanteSchema, cartaSchema, bitacoraSchema...
│   └── constants/        # ROLES, ESTADOS_CARTA, ESTADOS_VACANTE, ESTADOS_PRACTICA...
├── backend/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── config/        # conexión pg, variables de entorno
│       ├── middlewares/   # auth JWT, permisos por rol, manejo de errores
│       ├── jobs/          # node-cron: expiración 48h, alertas de bitácora
│       ├── modules/
│       │   ├── auth/  ├── alumnos/  ├── ofertadores/  ├── vacantes/  ├── practicas/
│       │   ├── bitacora/  ├── incidencias/  ├── bajas/  ├── cartas/  └── notificaciones/
│       ├── utils/
│       ├── app.js
│       └── server.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .env
    └── src/
        ├── assets/
        ├── components/
        ├── layouts/       # AlumnoLayout, OfertadorLayout, AdminLayout, SuperadminLayout
        ├── views/          # auth/ alumno/ ofertador/ admin/ superadmin/
        ├── router/         # rutas + guards por rol
        ├── stores/          # Pinia — un store por dominio
        ├── services/         # un archivo por módulo, llamadas axios
        └── utils/
```

## Especificaciones y restricciones técnicas

- Lenguaje: **JavaScript puro**, no TypeScript.
- Base de datos: **`pg` puro, sin ORM** — nada de Prisma, Drizzle ni Sequelize.
- **Explícitamente fuera de alcance**: TypeScript, cualquier ORM, testing automatizado con cobertura, Docker para frontend/backend (solo Postgres vía Docker Compose), CI/CD.
- No implementes ninguna lógica de negocio real todavía, ni siquiera de ejemplo — los archivos de módulo quedan como placeholders vacíos.

## Criterios de calidad / validación

- El `package.json` raíz declara correctamente los 3 workspaces (`frontend`, `backend`, `shared`).
- `npm install` desde la raíz corre sin errores e instala todo en los workspaces correspondientes.
- Cada uno de los 10 módulos backend tiene exactamente los 5 archivos de la convención.
- `docker-compose up` levanta Postgres sin necesitar configuración adicional.
- Ningún archivo generado contiene lógica de negocio, datos hardcodeados ni dependencias fuera de las listadas.

## Formato de respuesta esperado

Al terminar, muestra el árbol de carpetas final generado y confirma explícitamente que las dependencias instaladas coinciden exactamente con las listadas (ni una de más). No expliques cada archivo uno por uno — un resumen final es suficiente.

## Verificación final

Antes de dar la tarea por terminada, revisa: (1) que no se haya colado TypeScript, un ORM, o configuración de testing/CI; (2) que los 3 `package.json` de los workspaces existan y sean válidos; (3) que el árbol de carpetas coincida exactamente con el especificado arriba.
