# SIGEA Prácticas

Sistema de gestión de prácticas profesionales y residencias. Monorepo con:

- `frontend`: Vue 3, Vite, Pinia, PrimeVue y Tailwind.
- `backend`: Express 5 y PostgreSQL con `pg` puro.
- `shared`: constantes de roles y estados que usan ambos.

## Arranque local

Requisitos: Node 22 o superior y PostgreSQL 16 (con Docker o instalado en Windows).

1. **Dependencias.** Ejecuta `npm install` en la raíz del repo.
2. **Postgres.** Elige una opción:
   - Con Docker: `docker compose up -d` (usuario `sigea/sigea`, base `sigea_practicas`).
   - Sin Docker, como usuario `postgres`, una sola vez:

     ```sql
     CREATE ROLE sigea LOGIN PASSWORD 'sigea';
     CREATE DATABASE sigea_practicas OWNER sigea;
     \c sigea_practicas
     CREATE EXTENSION IF NOT EXISTS btree_gist;
     ```
3. **Variables de entorno.** Copia `.env.example` a `backend/.env` y ajusta los `PG*` y `JWT_SECRET`. En `frontend/.env` basta con `VITE_API_URL=/api`.
4. **Base de datos.**
   - `npm run db:migrate -w backend`: aplica las migraciones pendientes.
   - `npm run db:seed -w backend`: carga catálogos y usuarios de prueba. Se puede correr varias veces.
5. **Servidores.**
   - `npm run dev -w backend`: API en http://localhost:3000/api.
   - `npm run dev -w frontend`: app en http://localhost:5173. Vite redirige `/api` al backend, así que no hace falta CORS.

**Variables opcionales del backend:**

- `JOBS_DISABLED=true`: no programa los jobs (expiración de aceptaciones cada 5 min y alertas de bitácora a las 20:00).
- `INSTITUCION_NOMBRE`: nombre de la institución en los PDF.

## Usuarios de prueba (solo desarrollo)

`db:seed` crea un usuario por rol. Todos usan la contraseña `SigeaDev2026!`.

| Rol | Subrol | Correo |
|---|---|---|
| ESTUDIANTE | — | `estudiante@sigea.test` (matrícula A0000001, 7.º semestre) |
| OFERTADOR | — | `ofertador@sigea.test` (externo, "Empresa de Prueba") |
| ADMIN | ADMIN_ACADEMICO | `academico@sigea.test` |
| ADMIN | ADMIN_DOCUMENTAL | `documental@sigea.test` |
| SUPERADMIN | — | `superadmin@sigea.test` |

Estas cuentas son solo para desarrollo: no corras el seed en producción.

## Flujo del sistema

1. El **alumno** se registra, genera su carta de presentación, la imprime, la sella y sube el escaneo.
2. El **Admin Documental** aprueba la carta. A partir de ahí el alumno puede postularse.
3. El **ofertador** publica vacantes y acepta postulantes. Cada aceptación vence a las 48 h; al confirmar una, las demás se liberan y nace la práctica.
4. Durante la práctica:
   - el ofertador asigna tareas y el alumno entrega evidencias;
   - el alumno lleva bitácora diaria;
   - con 1 día sin registro se le recuerda al alumno, y con 3 se alerta al Admin Académico.
5. **Cierre:**
   - Por horas (240 h): lo pide el alumno.
   - Por proyecto: lo dispara el ofertador.
   - En ambos casos lo confirma siempre el Admin Académico.
6. **Bajas:** el ofertador solicita, el Admin Académico resuelve o escala, y el Superadmin decide.

## Estructura

- `backend/src/modules/<modulo>/`: cada módulo tiene `routes`, `controller`, `service`, `repository` y `validators`. El SQL va solo en `repository`.
- `backend/auth/db/`: migraciones, seed y runner.
- `backend/uploads/`: archivos subidos. No se versiona y solo se sirve por endpoints con control de acceso.
- `docs/`: [matriz de permisos](docs/matriz-permisos.md) y [pruebas manuales](docs/pruebas-manuales.md).
- [Guia_parapendejos.md](Guia_parapendejos.md): paso a paso para levantar y probar el sistema.
