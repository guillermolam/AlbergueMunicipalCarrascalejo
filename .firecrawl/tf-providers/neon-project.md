[Registry](https://registry.terraform.io/)

Browse


[Providers](https://registry.terraform.io/browse/providers) [Modules](https://registry.terraform.io/browse/modules) [Policy Libraries\\
Beta](https://registry.terraform.io/browse/policies) [Run Tasks\\
Beta](https://registry.terraform.io/browse/run-tasks)

[Publish](https://registry.terraform.io/sign-in)

[Sign-in](https://registry.terraform.io/sign-in)

- [Providers](https://registry.terraform.io/browse/providers)
- [terraform-community-providers](https://registry.terraform.io/namespaces/terraform-community-providers)
- [neon](https://registry.terraform.io/providers/terraform-community-providers/neon)
- Version 0.1.12








Latest Version
[Version\\
0.1.12\\
\\
\\
Published\\
2 months ago](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.12/docs/resources/project)
[Version\\
0.1.11\\
\\
\\
Published\\
2 months ago](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.11/docs/resources/project)
[Version\\
0.1.9\\
\\
\\
Published\\
9 months ago](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.9/docs/resources/project)
[Version\\
0.1.8\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.8/docs/resources/project)
[Version\\
0.1.7\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.7/docs/resources/project)



View all

versions





Latest Version

# neon

![terraform-community-providers](https://avatars3.githubusercontent.com/terraform-community-providers)

(2 months ago)


### neon

by:
[terraform-community-providers](https://registry.terraform.io/namespaces/terraform-community-providers)

- 23.5K
Installs

- [terraform-community-providers/terraform-provider-neon](https://github.com/terraform-community-providers/terraform-provider-neon)


#### latest version

0.1.12

Published
2 months ago

- [Overview](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.12)
- [Documentation](https://registry.terraform.io/providers/terraform-community-providers/neon/0.1.12/docs)

Use Provider


Browse
neon
documentation


neon
documentation


- [neon provider](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs)

Resources  - [neon\_branch](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/branch)
  - [neon\_database](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/database)
  - [neon\_endpoint](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/endpoint)
  - [neon\_project](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project)
  - [neon\_role](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/role)

Data Sources

# neon\_project (Resource)

Neon project.

## [Example Usage](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#example-usage)

```terraform

```

Copy

## [Schema](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#schema)

### [Required](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#required)

- [`name`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#name-1) (String) Name of the project.
- [`region_id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#region_id-1) (String) Region of the project.

### [Optional](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#optional)

- [`allowed_ips`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#allowed_ips-1) (Attributes) Allowed IP restriction settings for the project endpoints. (see [below for nested schema](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#nestedatt--allowed_ips))
- [`branch`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#branch-1) (Attributes) Default branch settings of the project. (see [below for nested schema](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#nestedatt--branch))
- [`history_retention`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#history_retention-1) (Number) PITR history retention period of the project in seconds. **Default**`86400` (1 day).
- [`logical_replication`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#logical_replication-1) (Boolean) Whether logical replication is enabled for the project endpoints. Cannot be switched off once turned on. **Default**`false`.
- [`org_id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#org_id-1) (String) Organization of the project.
- [`pg_version`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#pg_version-1) (Number) PostgreSQL version of the project. **Default**`15`.

### [Read-Only](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#read-only)

- [`id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#id-1) (String) Identifier of the project.
- [`platform_id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#platform_id-1) (String) Platform of the project.

### [Nested Schema for `allowed_ips`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#nested-schema-for-allowed_ips)

Optional:

- [`ips`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#ips-1) (List of String) List of IP addresses allowed to connect to the project endpoints.
- [`protected_branches_only`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#protected_branches_only-1) (Boolean) Whether restriction applies only to protected branches. **Default**`false`.

### [Nested Schema for `branch`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#nested-schema-for-branch)

Optional:

- [`endpoint`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#endpoint-1) (Attributes) Read-write compute endpoint settings of the branch. (see [below for nested schema](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#nestedatt--branch--endpoint))
- [`name`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#name-2) (String) Name of the branch.
- [`protected`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#protected-1) (Boolean) Whether the branch is protected. **Default**`false`.

Read-Only:

- [`id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#id-2) (String) Identifier of the branch.

### [Nested Schema for `branch.endpoint`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#nested-schema-for-branchendpoint)

Optional:

- [`max_cu`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#max_cu-1) (Number) Maximum number of compute units for the endpoint. **Default**`0.25`.
- [`min_cu`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#min_cu-1) (Number) Minimum number of compute units for the endpoint. **Default**`0.25`.
- [`suspend_timeout`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#suspend_timeout-1) (Number) Suspend timeout of the endpoint. **Default**`0`.

Read-Only:

- [`compute_provisioner`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#compute_provisioner-1) (String) Provisioner of the endpoint.
- [`host`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#host-1) (String) Host of the endpoint.
- [`id`](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#id-3) (String) Identifier of the endpoint.

## [Import](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project\#import)

Import is supported using the following syntax:

```shell

```

Copy

#### On this page

- [Example Usage](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#example-usage)
- [Schema](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#schema)
- [Import](https://registry.terraform.io/providers/terraform-community-providers/neon/latest/docs/resources/project#import)

[Report an issue](https://github.com/terraform-community-providers/terraform-provider-neon/issues)

[Intro](https://www.terraform.io/intro/index.html) [Learn](https://learn.hashicorp.com/terraform) [Docs](https://www.terraform.io/docs/registry/) [Extend](https://www.terraform.io/docs/extend/index.html) [Community](https://www.terraform.io/community.html) [Status](https://status.hashicorp.com/) [Privacy](https://www.hashicorp.com/privacy) [Security](https://www.terraform.io/security.html) [Terms](https://registry.terraform.io/terms) [Press Kit](https://www.terraform.io/assets/files/press-kit.zip)

iAsset 1© HashiCorp
2026