## Objetivo

Dejar las migraciones listas para Turso usando **libsql** como driver remoto, sin romper el flujo actual de migraciones con SeaORM/SQLite que ya tienes en `crates/migration`.

La idea es:
- Mantener **SeaORM + sqlx-sqlite** para SQLite local (dev/tests).
- Añadir un **camino paralelo de migraciones basado en libsql** para Turso (URL `libsql://…`).
- No mezclar libsql y sqlx-sqlite en el mismo binario para evitar conflictos de SQLite embebido.

---

## Limitaciones a tener en cuenta

- SQLx (y por extensión SeaORM) **no soporta todavía** libsql/Turso como driver remoto directo.
- No es seguro usar el fichero de réplica de libsql (embedded replica) como si fuera un SQLite cualquiera desde SQLx/SeaORM, porque la replicación de Turso depende de cómo se escriba el WAL.
- Por eso, la migración contra Turso debe hacerse **usando libsql directamente**, no a través del driver SQLite de SQLx.

---

## Diseño de alto nivel

1. **Mantener `albergue-migration` como está**
   - Sigue usando `sea-orm-migration` con `sqlx-sqlite` contra `sqlite://…`.
   - Lo usarás para desarrollo local y para validar el esquema con SQLite "puro".

2. **Crear un nuevo binario de migración remoto basado en libsql**
   - Nuevo crate o binario, por ejemplo `crates/turso-migration` con bin `albergue-turso-migration`.
   - Dependerá de `libsql`, `tokio`, `tracing` (ya están en el workspace).
   - Se conectará a Turso usando:
     - `DATABASE_URL` = URL `libsql://…` que da Turso.
     - `TURSO_AUTH_TOKEN` = token de acceso de Turso.

3. **Modelo de migraciones para Turso (driver libsql)**
   - Implementar un pequeño runner propio:
     - Definir un tipo `Migration { name: &'static str, up_sql: &'static [&'static str] }`.
     - Tener un `static MIGRATIONS: &[Migration]` con el mismo orden que en `crates/migration/src/lib.rs`:
       - `m20260111_000001_users`
       - `m20260111_000002_pilgrims`
       - … hasta `m20260111_000010_seed_synthetic_data`.
   - Cada migración tendrá las sentencias DDL/DML equivalentes a lo que ya haces con SeaORM:
     - `CREATE TABLE users (…)` con claves primarias, tipos, constraints.
     - `CREATE TABLE pilgrims (…)`.
     - `CREATE TABLE beds (…)` con índice único `idx_beds_bed_number`.
     - `CREATE TABLE bookings (…)` con FKs a `pilgrims` y `beds`, más índices.
     - `CREATE TABLE payments (…)` con FK a `bookings` e índice.
     - `CREATE TABLE pricing (…)` con índice compuesto `(room_type, bed_type)`.
     - `CREATE TABLE government_submissions (…)` con FK a `bookings`.
     - `CREATE TABLE notifications (…)` con FKs a `bookings` y `pilgrims` e índices.
     - `CREATE TABLE audit_log (…)` con FK a `users` e índice compuesto.
     - Seed de `synthetic_admin` en `users` igual que en `m20260111_000010_seed_synthetic_data`.

4. **Tabla de control de migraciones en Turso**
   - En el binario `albergue-turso-migration` se creará (si no existe) una tabla de metadatos, por ejemplo:
     - `CREATE TABLE IF NOT EXISTS seaql_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`.
   - El runner hará:
     - Leer versiones aplicadas.
     - Para cada migración en `MIGRATIONS` que no esté aplicada:
       - Ejecutar `up_sql` en una transacción libsql.
       - Insertar una fila en `seaql_migrations`.

5. **CLI del binario `albergue-turso-migration`**
   - Subcomandos básicos:
     - `up` → aplica todas las migraciones pendientes.
     - `status` → lista migraciones aplicadas/pending leyendo `seaql_migrations`.
     - (Opcional más adelante) `fresh` → **solo para desarrollo**, dropea tablas conocidas y vuelve a aplicar todo.
   - Se integrará con `DATABASE_URL` y `TURSO_AUTH_TOKEN` por env vars para no hardcodear secretos.

6. **Flujos de uso concretos**

   - **Dev local (SQLite):**
     - `DATABASE_URL=sqlite://albergue.db cargo run -p albergue-migration -- fresh`.
     - Esto sigue usando tu stack actual SeaORM/SQLx.

   - **Turso (libsql remoto):**
     1. Provisionar DB en Turso (`turso db create …`).
     2. Obtener URL y token (`turso db show --url`, `turso db tokens create …`).
     3. Ejecutar:
        - `DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… cargo run -p albergue-turso-migration -- up`.
     4. Ver estado:
        - `DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… cargo run -p albergue-turso-migration -- status`.

   - **Evolución del esquema:**
     - Cuando añadas nuevas migraciones en `crates/migration`:
       - Añadir la migración SeaORM habitual.
       - Añadir la migración SQL equivalente al array `MIGRATIONS` de `turso-migration`.
       - Así mantienes sincronizados ambos caminos.

7. **Relación con `crates/turso-sync` existente**
   - El crate `albergue-turso-sync` que ya tienes, basado en `libsql::Builder::new_remote_replica`, se puede usar para embebidos/replicas locales y lecturas rápidas.
   - El bin `albergue-turso-migration` será complementario: se conectará al mismo `DATABASE_URL` remoto para gestionar **esquema y seed**, no para lecturas embebidas.
   - Esto separa claramente responsabilidades:
     - `turso-sync` → sincronizar réplicas locales.
     - `turso-migration` → crear/actualizar el esquema en Turso.

---

## Cambios de código previstos

1. **Nuevo crate/binary de migraciones para Turso**
   - Añadir `crates/turso-migration/Cargo.toml` con:
     - `libsql`, `tokio`, `tracing`, `tracing-subscriber` como dependencias.
     - `[ [bin] ]` → `name = "albergue-turso-migration"`, `path = "src/main.rs"`.

2. **Implementar runner en `src/main.rs`**
   - Lógica de CLI sencilla (`std::env::args`): comandos `up` y `status`.
   - Función `connect()` que usa `libsql::Builder::new_remote(database_url, token)`.
   - Función `ensure_migrations_table()` para crear `seaql_migrations` si no existe.
   - Función `apply_pending_migrations()` que recorre `MIGRATIONS` y ejecuta `up_sql` pendiente en transacción.
   - Función `print_status()` que lista aplicado/pending.

3. **Definir las migraciones SQL equivalentes**
   - Traducir cada migración SeaORM existente a SQL explícito (CREATE TABLE, CREATE INDEX, ALTER, INSERT del seed).
   - Mantener las mismas constraints, índices y nombres para que el esquema sea idéntico.

4. **Documentar en README o comentarios de crate**
   - Sección "Migraciones contra Turso" con los comandos exactos de ejecución.
   - Notas claras de que el driver cambia:
     - SQLite local → SeaORM/SQLx-sqlite.
     - Turso → libsql remoto via `albergue-turso-migration`.

---

## Resultado esperado

- Podrás seguir usando tus migraciones actuales con SQLite local sin cambios.
- Tendrás un nuevo binario `albergue-turso-migration` que habla con Turso/libsql directamente y crea el mismo esquema que definen las migraciones de SeaORM.
- El flujo para inicializar/actualizar la base en Turso quedará estandarizado y repetible (solo con variables de entorno distintas según entorno).

Si te parece bien este plan, en el siguiente paso implemento el crate `turso-migration`, el runner libsql y las migraciones SQL equivalentes, y te lo dejo ya corriendo contra un Turso de prueba (si me das la URL/token de staging o usamos placeholders).