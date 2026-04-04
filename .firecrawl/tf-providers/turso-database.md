[Registry](https://registry.terraform.io/)

Browse


[Providers](https://registry.terraform.io/browse/providers) [Modules](https://registry.terraform.io/browse/modules) [Policy Libraries\\
Beta](https://registry.terraform.io/browse/policies) [Run Tasks\\
Beta](https://registry.terraform.io/browse/run-tasks)

[Publish](https://registry.terraform.io/sign-in)

[Sign-in](https://registry.terraform.io/sign-in)

- [Providers](https://registry.terraform.io/browse/providers)
- [celest-dev](https://registry.terraform.io/namespaces/celest-dev)
- [turso](https://registry.terraform.io/providers/celest-dev/turso)
- Version 0.2.3








Latest Version
[Version\\
0.2.3\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.3/docs/resources/database)
[Version\\
0.2.2\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.2/docs/resources/database)
[Version\\
0.2.1\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.1/docs/resources/database)
[Version\\
0.2.0\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.0/docs/resources/database)
[Version\\
0.1.0\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.1.0/docs/resources/database)



View all

versions





Latest Version

# turso

![celest-dev](https://avatars3.githubusercontent.com/celest-dev)

(a year ago)


### turso

by:
[celest-dev](https://registry.terraform.io/namespaces/celest-dev)

- 24.2K
Installs

- [celest-dev/terraform-provider-turso](https://github.com/celest-dev/terraform-provider-turso)


#### latest version

0.2.3

Published
a year ago

- [Overview](https://registry.terraform.io/providers/celest-dev/turso/0.2.3)
- [Documentation](https://registry.terraform.io/providers/celest-dev/turso/0.2.3/docs)

Use Provider


Browse
turso
documentation


turso
documentation


- [turso provider](https://registry.terraform.io/providers/celest-dev/turso/latest/docs)

Resources  - [turso\_database](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database)
  - [turso\_group](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group)

Data Sources

# turso\_database (Resource)

## [Example Usage](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#example-usage)

```terraform

```

Copy

## [Schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#schema)

### [Required](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#required)

- [`group`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#group-1) (String) The name of the group where the database should be created. **The group must already exist.**
- [`name`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#name-1) (String) The name of the new database. Must contain only lowercase letters, numbers, dashes. No longer than 64 characters.

### [Optional](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#optional)

- [`allow_attach`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#allow_attach-1) (Boolean) Allow or disallow attaching databases to the current database.
- [`block_reads`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#block_reads-1) (Boolean) Block all database reads.
- [`block_writes`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#block_writes-1) (Boolean) Block all database writes.
- [`id`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#id-1) (String) The name of the database.
- [`is_schema`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#is_schema-1) (Boolean) Mark this database as the parent schema database that updates child databases with any schema changes. See [Multi-DB Schemas](https://registry.terraform.io/features/multi-db-schemas).
- [`schema`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#schema-1) (String) The name of the parent database to use as the schema. See [Multi-DB Schemas](https://registry.terraform.io/features/multi-db-schemas).
- [`seed`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#seed-1) (Attributes) (see [below for nested schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#nestedatt--seed))
- [`size_limit`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#size_limit-1) (String) The maximum size of the database in bytes. Values with units are also accepted, e.g. 1mb, 256mb, 1gb.

### [Read-Only](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#read-only)

- [`database`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#database-1) (Attributes) (see [below for nested schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#nestedatt--database))

### [Nested Schema for `seed`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#nested-schema-for-seed)

Optional:

- [`name`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#name-2) (String) The name of the existing database when `database` is used as a seed type.
- [`timestamp`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#timestamp-1) (String) A formatted [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) recovery point to create a database from. This must be within the last 24 hours, or 30 days on the scaler plan.
- [`type`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#type-1) (String) The type of seed to be used to create a new database.
- [`url`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#url-1) (String) The URL returned by [upload dump](https://registry.terraform.io/api-reference/databases/upload-dump) can be used with the `dump` seed type.

### [Nested Schema for `database`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#nested-schema-for-database)

Read-Only:

- [`allow_attach`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#allow_attach-2) (Boolean) The current status for allowing the database to be attached to another.
- [`archived`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#archived-1) (Boolean) The current status of the database. If `true`, the database is archived and requires a manual unarchive step.
- [`block_reads`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#block_reads-2) (Boolean) The current status for blocked reads.
- [`block_writes`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#block_writes-2) (Boolean) The current status for blocked writes.
- [`db_id`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#db_id-1) (String) The database universal unique identifier (UUID).
- [`group`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#group-2) (String) The name of the group the database belongs to.
- [`hostname`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#hostname-1) (String) The DNS hostname used for client libSQL and HTTP connections.
- [`is_schema`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#is_schema-2) (Boolean) If this database controls other child databases then this will be `true`. See [Multi-DB Schemas](https://registry.terraform.io/features/multi-db-schemas).
- [`name`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#name-3) (String) The database name, **unique** across your organization.
- [`primary_region`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#primary_region-1) (String) The primary region location code the group the database belongs to.
- [`regions`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#regions-1) (List of String) A list of regions for the group the database belongs to.
- [`schema`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#schema-2) (String) The name of the parent database that owns the schema for this database. See [Multi-DB Schemas](https://registry.terraform.io/features/multi-db-schemas).
- [`type`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#type-2) (String) The string representing the object type.
- [`version`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#version-1) (String) The current libSQL version the database is running.

## [Import](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database\#import)

Import is supported using the following syntax:

```shell

```

Copy

#### On this page

- [Example Usage](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#example-usage)
- [Schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#schema)
- [Import](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/database#import)

[Report an issue](https://github.com/celest-dev/terraform-provider-turso/issues)

[Intro](https://www.terraform.io/intro/index.html) [Learn](https://learn.hashicorp.com/terraform) [Docs](https://www.terraform.io/docs/registry/) [Extend](https://www.terraform.io/docs/extend/index.html) [Community](https://www.terraform.io/community.html) [Status](https://status.hashicorp.com/) [Privacy](https://www.hashicorp.com/privacy) [Security](https://www.terraform.io/security.html) [Terms](https://registry.terraform.io/terms) [Press Kit](https://www.terraform.io/assets/files/press-kit.zip)

iAsset 1© HashiCorp
2026