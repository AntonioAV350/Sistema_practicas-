# SIGEA Prácticas — Sistema de Prácticas y Residencias

Monorepo npm workspaces (`frontend`, `backend`, `shared`). Backend Node/Express 5 + PostgreSQL con `pg` puro. Frontend Vue 3 + Vite + Pinia + PrimeVue + Tailwind.

## Reglas de trabajo (siempre)
- `main` está protegida: todo cambio entra por PR con 1 aprobación de otra persona. Nunca hagas push, merge ni force push a `main`.
- `--force-with-lease` solo en ramas `feature/*`, y avisando antes de ejecutarlo.
- Pregunta antes de cada commit, salvo que el usuario autorice explícitamente un grupo de commits en el chat.
- No agregues dependencias nuevas sin avisar primero.
- Ramas: `feature/SIGEA-<n>-<descripcion>`. Commits con prefijo `SIGEA-<n>: `.
- Las ramas pueden estar apiladas; respeta el orden de merge que indique el usuario.

## Restricciones técnicas
- JavaScript puro (CommonJS en backend). Nada de TypeScript.
- `pg` puro, sin ORM (nada de Prisma, Drizzle ni Sequelize).
- Fuera de alcance: CI/CD y Docker para frontend/backend (Docker solo para Postgres vía `docker-compose.yml`).

## Estructura y convenciones
- Backend: `backend/src/modules/<modulo>/` con 5 archivos: `routes.js`, `controller.js`, `service.js`, `repository.js`, `validators.js`. SQL solo en `repository.js`; validación con zod en `validators.js`.
- Middlewares: `backend/src/middlewares/auth.js` (JWT), `roles.js` (`requireRole`, llega con SIGEA-8), `errorHandler.js`.
- BD: migraciones en `backend/auth/db/migrations/NNN_*.sql`, seed en `backend/auth/db/seed.sql`, runner en `backend/auth/db/migrate.js`. Esquema `core.*` (usuarios, roles, usuario_roles…). No modifiques migraciones ya mergeadas; crea una nueva.
- `shared/`: `schemas/` (zod) y `constants/` (ROLES, estados) compartidos entre front y back.

## Comandos
- `docker compose up -d` — Postgres local
- `npm install` (raíz) — instala todos los workspaces
- `npm run db:migrate -w backend` / `npm run db:seed -w backend`
- `npm run dev -w backend`

## Dominio
Códigos de rol en `core.roles`: `ESTUDIANTE`, `OFERTADOR`, `ADMIN`, `ADMIN_ACADEMICO`, `ADMIN_DOCUMENTAL`, `SUPERADMIN`.
Entidades: vacantes, postulaciones/aceptaciones, prácticas activas, cartas de presentación, bitácora, tareas, incidencias, bajas, notificaciones.

## Reglas de negocio
- Carta de presentación: paso previo obligatorio para seleccionar práctica (generar PDF → alumno lo sella/firma → lo sube → Admin Documental valida).
- Un alumno puede tener varias aceptaciones pendientes; al confirmar una, las demás se liberan; cada una expira sola a las 48h.
- Avances: el Ofertador asigna tareas y el Alumno lleva bitácora diaria obligatoria.
- Prácticas "por horas" (240h) o "por contrato"; el cierre siempre lo confirma el Administrador, nunca es automático.
- Bajas: Ofertador solicita → Administrador gestiona → Superadministrador aprueba en definitiva.
- Alertas de bitácora: 1 día sin registrar → recordatorio al Alumno; 3 días → alerta al Administrador.
