## Contexto y constraints

- SeaORM en este repo usa `sqlx-sqlite` (`sqlite://...`) y no puede conectarse a `libsql://...` directamente.
- En libsql (Rust) el modo embedded replica se crea con `Builder::new_remote_replica(...)` y soporta `sync_interval(...)`, `read_your_writes(...)`, y también cifrado local vía `encryption_config(...)` si se habilita la feature `encryption`. Esto delega writes al remoto por defecto. [web_search_result 2] [web_search_result 3]
- Importante: Turso advierte no abrir el fichero local mientras se está sincronizando, porque puede corromperse. Por tanto:
  - **Periodic sync (60s / corto)** es viable si el proceso accede a la BD mediante **libsql** (embedded replica).
  - Si el proceso accede mediante **SeaORM/sqlite directo**, el sync debe ser **manual y coordinado** (sin DB abierta) o hay que aceptar que no hay sync continuo.

## Objetivos (según tu lista)

- Ajustar servicios:
  - Dev: embedded replicas con sync periódico (60s).
  - Prod: lectura local + writes al remoto + sync periódico corto.
- Documentación con variables y flujos dev/prod.
- Tests de integración:
  1. Validar migraciones y replicaciones locales.
  2. Validar migraciones remotas usando Turso CLI.
- Automatizar todo con `Taskfile.yml` y taskfiles downstream.
- Diseñar/testear/implementar automatización para encryption at rest.
- Incorporar patrones de los ejemplos oficiales de libsql (remote*sync/local_sync/replica/encryption*\*), y definir una integración “correcta” con SeaORM.

## Diseño de integración (SeaORM vs libsql)

### Opción A (recomendada para embedded replica real)

- **Servicios que quieran sync periódico y writes delegados al remoto**:
  - Usan **libsql** como driver de runtime (no SeaORM) para acceder a la BD.
  - Se crea el `Database` con:
    - `Builder::new_remote_replica(local_path, url, token)`
    - `.sync_interval(Duration::from_secs(60))` en dev, y 5–30s en prod
    - opcional: `.encryption_config(...)` (encryption at rest) [web_search_result 3]
- SeaORM queda para:
  - Generación/gestión de migraciones locales (sqlite) en el dominio.
  - (Opcional) un “read model” separado cuando no haya sync corriendo.

### Opción B (SeaORM runtime)

- Servicios siguen usando SeaORM sobre `sqlite://<file>`.
- Replicación embedded **no corre en background**; se hace **sync manual** antes de levantar el proceso, y en ventanas de mantenimiento.
- Es la única forma de evitar el riesgo “no abrir mientras sync” si queremos mantener SeaORM.

## Implementación propuesta (código)

1. **Crear un módulo de configuración DB por servicio** (en `backend/shared` y/o `domain_model/rust/crates/persistence`) con un selector explícito:
   - `DB_MODE=seaorm_sqlite` (Opción B)
   - `DB_MODE=libsql_embedded_replica` (Opción A)
   - Variables:
     - `TURSO_DATABASE_URL` (o `DATABASE_URL` remoto)
     - `TURSO_AUTH_TOKEN`
     - `TURSO_REPLICA_PATH`
     - `TURSO_SYNC_INTERVAL_SECS`
     - `TURSO_ENCRYPTION_KEY` (+ cipher opcional)
2. **Implementar conexión libsql runtime** en los servicios que lo soporten:
   - Incluir helpers inspirados en ejemplos oficiales (replica/local_sync/remote_sync/transaction).
   - Asegurar `sync_interval` configurable y modo `read_your_writes` configurable. [web_search_result 2] [web_search_result 3]
3. **Migración remota (baseline)**:
   - Mantener un baseline SQL idempotente que represente el esquema actual (tablas+índices+seed mínimo).
   - Implementar “migration tracker” en remoto (tabla `_albergue_migrations`) y un comando `migrate-remote`.

## Tests de integración

### 1) Local: migraciones + replica (sin Turso)

- Test A: “SeaORM migrations smoke”
  - Crear sqlite temporal.
  - Ejecutar `albergue-migration up`.
  - Verificar tablas/índices.
- Test B: “libsql local encrypted/open”
  - Crear DB local con libsql, habilitar cifrado, insertar datos, verificar que abrir sin `encryption_config` falla (o devuelve error coherente).
  - Requiere habilitar feature `encryption` y tooling (cmake) en el entorno CI/local. [web_search_result 3]

### 2) Remoto: migración y replica con Turso (requiere credenciales)

- Test C: “migrate-remote + verify schema”
  - Crear DB efímera con Turso CLI.
  - Obtener URL y token.
  - Ejecutar `migrate-remote`.
  - Verificar con `turso` (o con libsql remote) que existen tablas esperadas.
  - Destruir DB.
- Test D: “embedded replica sync”
  - Crear tabla/row en remoto.
  - Lanzar embedded replica local (libsql) y forzar `sync()`.
  - Verificar que se ve el row local.

- Todos los tests remotos deben estar condicionados por env vars (`TURSO_*`) y marcarse como “skipped” si no están presentes.

## Automatización con Taskfile

1. Añadir `taskfiles/Taskfile.turso.yml` e incluirlo desde `Taskfile.yml`.
2. Tareas nuevas:
   - `turso:deps:check` (turso cli, cargo, cmake si encryption)
   - `turso:db:create` / `turso:db:destroy` / `turso:db:url` / `turso:db:token`
   - `turso:migrate:remote`
   - `turso:replica:sync` y `turso:replica:sync:loop` (interval)
   - `turso:test:integration:local` (migrations+encryption local)
   - `turso:test:integration:remote` (crea db efímera, migra, verifica, destruye)
3. Integrar en `task test` de forma opcional:
   - `task test` mantiene unit tests.
   - `task turso:test:integration:remote` se ejecuta sólo si `TURSO_*` está seteado.

## Documentación

- Crear doc breve en `docs/` con:
  - Variables de entorno dev/prod.
  - Flujos recomendados (Opción A vs B) y por qué.
  - Runbook de tareas Taskfile.
  - Notas de seguridad/cifrado.

## Encriptación at rest (automatización)

- Basado en soporte del crate `libsql`:
  - Activar feature `encryption` y usar `EncryptionConfig`/`Cipher` + clave (Bytes).
  - Soportar también `encryption_context` si el remoto está cifrado (si aplica).
  - Tests:
    - “encrypted local file cannot be opened without key”.
    - “encrypted embedded replica can sync + query”.

## Entregables

- Taskfiles Turso (create/destroy/migrate/sync/test) + integración en pipelines.
- Documentación dev/prod.
- Suite de tests locales + remotos (guarded).
- Implementación de cifrado y tests.
- Ajuste de servicios para soportar `DB_MODE` (al menos uno de referencia), dejando el patrón replicable.

Si estás de acuerdo, implemento empezando por: Taskfile.turso.yml + tests locales + cifrado; luego tests remotos (Turso CLI) y finalmente adaptar 1 servicio “piloto” al modo libsql embedded replica.
