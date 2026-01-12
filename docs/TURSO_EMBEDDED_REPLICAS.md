# Turso / libSQL Embedded Replicas

## Objetivo

Usar Turso como primario remoto y una copia local (embedded replica) para lecturas rápidas, con un flujo de migraciones repetible y automatizable.

## Realidad técnica (SeaORM vs libSQL)

- SeaORM (vía sqlx) solo conecta a SQLite por `sqlite://...` (archivo local).
- Turso remoto usa `libsql://...` y requiere el cliente libsql.
- Las embedded replicas sincronizan un archivo local con un primario remoto.
- No se debe abrir el archivo local mientras la embedded replica está sincronizando (riesgo de corrupción). Esto implica que un proceso con SeaORM abriendo el archivo no debe convivir con un proceso que haga `sync()` sobre el mismo archivo.

En este repo, la estrategia recomendada es:

- Migraciones locales y tests locales: SQLite local.
- Migración remota (baseline): se aplica directamente contra Turso remoto.
- Embedded replica: usar libsql (no SeaORM) para procesos que requieran sync periódico y garantías de read-your-writes.

## Variables de entorno

- `DATABASE_URL`
  - Remoto Turso: `libsql://...`
  - Local (solo SQLite): `sqlite://./albergue.local.db`
- `TURSO_AUTH_TOKEN`: token de Turso para conexiones remotas.
- `TURSO_REPLICA_PATH`: ruta del archivo local de la embedded replica (ej: `./albergue.local.db`).
- `TURSO_ENCRYPTION_KEY` (opcional): activa cifrado at-rest del archivo local (embedded replica).
- `TURSO_ENCRYPTION_CIPHER` (opcional): por defecto `aes256cbc`.

## Flujos

### Desarrollo (recomendado)

Opción A: SQLite local + migraciones SeaORM

- Ejecutar migraciones localmente y trabajar con un único archivo SQLite.

Opción B: Embedded replica con sync periódico (solo libsql)

- Ejecutar un proceso dedicado que mantenga sincronizada la replica local.

### Producción (embedded replica)

- La app debe acceder al DB usando libsql para que el runtime coordine correctamente lecturas locales y escrituras delegadas al primario remoto.
- Ejecutar migración remota (baseline) antes de levantar tráfico.

## Comandos (Task)

- Sync (una vez):
  - `task turso:sync DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... TURSO_REPLICA_PATH=./albergue.local.db`
- Sync periódico (mantiene el proceso vivo):
  - `task turso:sync:loop DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... TURSO_REPLICA_PATH=./albergue.local.db SYNC_INTERVAL_SECS=60`
- Migrar remoto (baseline):
  - `task turso:migrate:remote DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=...`
- Estado remoto:
  - `task turso:status:remote DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=...`
- Tests locales (baseline + cifrado):
  - `task turso:test:local`
- Test remoto end-to-end (crea DB temporal, migra y destruye):
  - `task turso:test:remote`

## Cifrado at-rest

- Para cifrar el archivo local de la embedded replica, setear `TURSO_ENCRYPTION_KEY`.
- Requisitos: el feature `encryption` de libsql y toolchain nativa (incluye `cmake`).
- Test local incluido en `albergue-turso-sync` valida que un DB cifrado no abre sin clave.

## Migraciones

- La migración remota usa un baseline SQL (esquema actual) y lo registra en `_albergue_migrations` con el nombre `m20260111_000000_baseline`.
- Esto evita depender de SeaORM en remoto y deja el primario Turso listo para sincronizar replicas.
