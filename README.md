# SIGEA Prácticas

Sistema de gestión de prácticas profesionales y residencias. Monorepo con `frontend` (Vue 3), `backend` (Express + PostgreSQL) y `shared`.

## Arranque local

```bash
npm install
docker compose up -d
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev -w backend
```

Copia `.env.example` a `backend/.env` y ajusta los valores si hace falta.

## Usuarios de prueba (solo desarrollo)

`db:seed` crea un usuario por rol. Todos usan la contraseña `SigeaDev2026!`.

| Rol | Subrol | Correo |
|---|---|---|
| ESTUDIANTE | — | `estudiante@sigea.test` |
| OFERTADOR | — | `ofertador@sigea.test` |
| ADMIN | ADMIN_ACADEMICO | `academico@sigea.test` |
| ADMIN | ADMIN_DOCUMENTAL | `documental@sigea.test` |
| SUPERADMIN | — | `superadmin@sigea.test` |

Estas cuentas son solo para desarrollo: no corras el seed en producción.
