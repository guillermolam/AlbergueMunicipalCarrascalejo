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
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.3/docs/resources/group)
[Version\\
0.2.2\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.2/docs/resources/group)
[Version\\
0.2.1\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.1/docs/resources/group)
[Version\\
0.2.0\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.2.0/docs/resources/group)
[Version\\
0.1.0\\
\\
\\
Published\\
a year ago](https://registry.terraform.io/providers/celest-dev/turso/0.1.0/docs/resources/group)



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

# turso\_group (Resource)

## [Schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group\#schema)

### [Required](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group\#required)

- [`locations`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#locations-1) (Set of String) All locations for the new group.
- [`name`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#name-1) (String) The name of the new group.
- [`primary`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#primary-1) (String) The primary location key for the new group.

### [Optional](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group\#optional)

- [`extensions`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#extensions-1) (String) Set to `all` to enable all extensions.
- [`id`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#id-1) (String) The name of the group.

### [Read-Only](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group\#read-only)

- [`group`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#group-1) (Attributes) (see [below for nested schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#nestedatt--group))

### [Nested Schema for `group`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group\#nested-schema-for-group)

Read-Only:

- [`archived`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#archived-1) (Boolean) Groups on the free tier get archived after some inactivity.
- [`locations`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#locations-2) (Set of String) An array of location keys the group is located.
- [`name`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#name-2) (String) The group name, unique across your organization.
- [`primary`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#primary-2) (String) The primary location key.
- [`uuid`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#uuid-1) (String) The group universal unique identifier (UUID).
- [`version`](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#version-1) (String) The current libSQL server version the databases in that group are running.

#### On this page

- [Schema](https://registry.terraform.io/providers/celest-dev/turso/latest/docs/resources/group#schema)

[Report an issue](https://github.com/celest-dev/terraform-provider-turso/issues)

[Intro](https://www.terraform.io/intro/index.html) [Learn](https://learn.hashicorp.com/terraform) [Docs](https://www.terraform.io/docs/registry/) [Extend](https://www.terraform.io/docs/extend/index.html) [Community](https://www.terraform.io/community.html) [Status](https://status.hashicorp.com/) [Privacy](https://www.hashicorp.com/privacy) [Security](https://www.terraform.io/security.html) [Terms](https://registry.terraform.io/terms) [Press Kit](https://www.terraform.io/assets/files/press-kit.zip)

iAsset 1© HashiCorp
2026