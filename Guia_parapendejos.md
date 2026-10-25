# Guía para pendejos: cómo levantar y probar SIGEA en tu compu

Sigue los pasos **en orden** y en una terminal de **PowerShell** abierta en la carpeta del proyecto. Si algo truena, primero revisa "Problemas comunes" al final.

---

## 0. Lo que necesitas instalado

| Programa | Versión | Cómo checar |
|---|---|---|
| Node.js | 22 o mayor | `node -v` |
| Git | cualquiera | `git --version` |
| PostgreSQL | 16 | Debe estar el servicio `postgresql-x64-16` corriendo (o Docker, ver paso 2) |

> **Docker es opcional.** Si tu laptop dice *"Virtualization support not detected"*, olvídate de Docker y usa PostgreSQL instalado directo en Windows.

---

## 1. Bajar el código

La primera vez:

```powershell
git clone https://github.com/AntonioAV350/Sistema_practicas-.git
```
```powershell
cd Sistema_practicas-
```

Si ya lo tenías clonado:

```powershell
git fetch origin
```
```powershell
git switch main
```
```powershell
git pull
```

Instala las dependencias de los 3 workspaces (frontend, backend y shared) con un solo comando:

```powershell
npm install
```

---

## 2. Crear la base de datos (solo una vez)

### Opción A: PostgreSQL instalado en Windows (recomendada)

Corre esto **una sola vez**. Te va a pedir la contraseña del usuario `postgres`, la que pusiste al instalar PostgreSQL. **Al escribirla no se ve nada; es normal.** Escríbela y dale Enter.

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE sigea LOGIN PASSWORD 'sigea';" -c "CREATE DATABASE sigea_practicas_test OWNER sigea;" -c "\c sigea_practicas_test" -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

Si sale bien verás `CREATE ROLE`, `CREATE DATABASE` y `CREATE EXTENSION`. Si dice que el rol o la base **ya existen**, no pasa nada: ya los tenías.

> ⚠️ En PowerShell el `&` del inicio es obligatorio y la ruta va con `\`. Si lo copias con `/c/Program Files/...` te da `Token '-U' inesperado`.

### Opción B: Docker

```powershell
docker compose up -d
```

Esto levanta Postgres con usuario `sigea`, contraseña `sigea` y la base `sigea_practicas`. Si usas Docker, en el paso 3 pon `PGDATABASE=sigea_practicas`.

---

## 3. Archivos `.env`

No se suben a GitHub, cada quien crea los suyos.

**`backend/.env`:** copia `.env.example` y deja esto:

```
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=sigea
PGPASSWORD=sigea
PGDATABASE=sigea_practicas_test
JWT_SECRET=pon-aqui-cualquier-texto-largo
JWT_EXPIRES_IN=8h
```

**`frontend/.env`:**

```
VITE_API_URL=/api
```

Para copiar el ejemplo rápido:

```powershell
Copy-Item .env.example backend\.env
```

Después abre `backend\.env`, cambia `PGDATABASE` y `JWT_SECRET`, y borra las líneas que empiezan con `POSTGRES_` y `VITE_`, que no las usa el backend.

---

## 4. Crear las tablas y los datos de prueba

**Crea las tablas.** Corre las 9 migraciones; si ya estaban, solo dice "al día":

```powershell
npm run db:migrate -w backend
```

**Carga los datos de prueba:** catálogos, carreras semestrales y cuatrimestrales, ciclos, empresa y usuarios. Se puede correr las veces que quieras:

```powershell
npm run db:seed -w backend
```

---

## 5. Levantar el sistema (cada vez que lo uses)

Necesitas **2 terminales abiertas al mismo tiempo**.

**Terminal 1, el backend (API):**

```powershell
npm run dev -w backend
```

Tiene que decir `Server running on port 3000`.

**Terminal 2, el frontend (la página):**

```powershell
npm run dev -w frontend
```

Abre en el navegador la dirección que salga en `Local:`. Normalmente es **http://localhost:5173**.

- Para apagar: `Ctrl + C` en cada terminal.
- Para reiniciar el backend sin cerrarlo: escribe `rs` y Enter.

---

## 6. Credenciales de prueba

> 🔒 Son **solo para desarrollo**. Nunca uses estas contraseñas ni el seed en un servidor real.

### Base de datos

| Dato | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Usuario | `sigea` |
| Contraseña | `sigea` |
| Base de pruebas | `sigea_practicas_test` (con Docker: `sigea_practicas`) |

Con estos datos te puedes conectar también desde pgAdmin o DBeaver.

### Usuarios del sistema (los crea el seed)

Todos usan la contraseña **`SigeaDev2026!`**.

| Rol | Correo | Qué puede hacer |
|---|---|---|
| Superadmin | `superadmin@sigea.test` | Todo lo del admin, más cuentas, empresas y la decisión final de las bajas |
| Admin Académico | `academico@sigea.test` | Prácticas, cierres, incidencias y bajas (primera revisión) |
| Admin Documental | `documental@sigea.test` | Revisar cartas de presentación |
| Ofertador | `ofertador@sigea.test` | Vacantes, postulantes, tareas, carta de aceptación, incidencias y bajas |
| Alumno | `estudiante@sigea.test` | Carta, postulaciones, bitácora y tareas (matrícula A0000001, 7.º semestre) |

**Tip:** para probar desde cero, mejor registra un alumno nuevo en **/registro**. Elige una carrera con al menos el periodo mínimo: 6.º semestre o 7.º cuatrimestre.

---

## 7. Recorrido para probar todo

Usa una **ventana normal** para un rol y una de **incógnito** para otro; así tienes dos sesiones a la vez.

1. **Alumno:** se registra → *Carta de presentación* → Generar → descarga el PDF → sube un PDF o imagen como "escaneo firmado".
2. **Documental:** *Cartas por revisar* → rechaza una (con comentario) y aprueba la siguiente.
3. **Ofertador:** *Mis vacantes* → Publicar vacante (tipo **Por horas**).
4. **Alumno:** *Vacantes* → Postularme.
5. **Ofertador:** entra a la vacante → Aceptar. El alumno tiene **48 h** para confirmar.
6. **Alumno:** *Mis postulaciones* → Confirmar práctica.
7. **Ofertador:** *Mis practicantes* → asigna una tarea y genera la carta de aceptación.
8. **Alumno:** *Mi práctica* → registra la bitácora y entrega la tarea con un archivo.
9. **Ofertador:** revisa la tarea. En la pestaña *Incidencias y bajas* registra una incidencia y solicita una baja.
10. **Académico:** resuelve la incidencia; en *Bajas* → Atender → **Escalar**.
11. **Superadmin:** *Bajas escaladas* → Aprobar o Rechazar.
12. **Cierre:** el alumno, con 240 h, da *Solicitar cierre* → el Académico lo confirma en *Cierres*.

La lista completa de casos a probar está en [`docs/pruebas-manuales.md`](docs/pruebas-manuales.md), y quién puede hacer qué en [`docs/matriz-permisos.md`](docs/matriz-permisos.md).

### Atajos para no esperar días

Córrelos en pgAdmin o psql conectado a `sigea_practicas_test`.

Juntar las 240 h de golpe (cambia el `3` por el id de la práctica):

```sql
INSERT INTO practicas.bitacora (id_practica, fecha, horas, descripcion)
SELECT 3, current_date, 24, 'horas de prueba' FROM generate_series(1, 10);
```

Hacer que expiren las aceptaciones pendientes (luego reinicia el backend con `rs`):

```sql
UPDATE practicas.aceptaciones SET expira_en = now() - interval '1 minute' WHERE estado = 'PENDIENTE';
```

Mandar ya las alertas de bitácora (normalmente salen a las 20:00):

```sql
SELECT practicas.sp_revisar_bitacoras();
```

---

## 8. Reglas para trabajar en el repo

- **Nunca** hagas push directo a `main`. Crea una rama `feature/SIGEA-<n>-<descripcion>` y abre un PR.
- Los commits empiezan con el ticket: `SIGEA-<n>: lo que hiciste`.
- JavaScript puro (sin TypeScript) y `pg` sin ORM.
- Cada módulo del backend tiene 5 archivos: `routes`, `controller`, `service`, `repository` y `validators`. **El SQL va solo en `repository`.**
- No modifiques migraciones que ya están en `main`; si necesitas cambiar la BD, crea una nueva (`010_...sql`).
- No agregues dependencias sin avisar al equipo.

---

## 9. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| El login no hace nada o la terminal del frontend dice `ECONNREFUSED` | El backend no está corriendo | Arranca o reinicia la Terminal 1 (`npm run dev -w backend`) |
| `El puerto 3000 ya está en uso` | Tienes otro backend abierto | Cierra la otra terminal o cambia `PORT` en `backend/.env` |
| `no existe la base de datos "sigea_practicas_test"` | No hiciste el paso 2 | Corre el comando del paso 2 |
| `la autentificación password falló para el usuario "sigea"` | No existe el rol `sigea` o su contraseña es otra | Corre el paso 2 (crea el rol) |
| `permission denied to create extension "btree_gist"` | El usuario `sigea` no puede crear extensiones | Corre el paso 2 completo, que la crea como `postgres` |
| `Token '-U' inesperado` | Copiaste el comando de psql sin `&` o con `/c/...` | Usa el comando exacto del paso 2 |
| Letrero rojo **"Invalid PrimeUI License"** | PrimeVue 5 pide una clave | No afecta nada. Para quitarlo, saca la Community License gratis en https://primeui.dev/licenses/community y ponla en `frontend/.env` como `VITE_PRIMEUI_LICENSE=...` |
| `Cannot find module ...` | Faltan dependencias | `npm install` en la raíz |
| La página carga pero sale "No se pudo conectar con el servidor" | Backend apagado o `frontend/.env` mal | Revisa que `VITE_API_URL=/api` y que el backend esté arriba |

Si nada de esto funciona, manda una captura de **las dos terminales** al grupo.
