[Registry](https://registry.terraform.io/)

Browse


[Providers](https://registry.terraform.io/browse/providers) [Modules](https://registry.terraform.io/browse/modules) [Policy Libraries\\
Beta](https://registry.terraform.io/browse/policies) [Run Tasks\\
Beta](https://registry.terraform.io/browse/run-tasks)

[Publish](https://registry.terraform.io/sign-in)

[Sign-in](https://registry.terraform.io/sign-in)

- [Providers](https://registry.terraform.io/browse/providers)
- [cloudflare](https://registry.terraform.io/namespaces/cloudflare)
- [cloudflare](https://registry.terraform.io/providers/cloudflare/cloudflare)
- Version 5.19.0-beta.4








Latest Version
[Version\\
5.19.0-beta.4\\
\\
\\
Published\\
3 days ago](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.4/docs)
[Version\\
5.19.0-beta.3\\
\\
\\
Published\\
8 days ago](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.3/docs)
[Version\\
5.19.0-beta.2\\
\\
\\
Published\\
18 days ago](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.2/docs)
[Version\\
5.19.0-beta.1\\
\\
\\
Published\\
a month ago](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.1/docs)
[Version\\
5.18.0\\
\\
\\
Published\\
a month ago](https://registry.terraform.io/providers/cloudflare/cloudflare/5.18.0/docs)



View all

versions





Latest Version

# cloudflare

![cloudflare](https://avatars3.githubusercontent.com/cloudflare)

(3 days ago)


### cloudflare

by:
[cloudflare](https://registry.terraform.io/namespaces/cloudflare)

Partner


- 231.0M
Installs

- [cloudflare/terraform-provider-cloudflare](https://github.com/cloudflare/terraform-provider-cloudflare)


#### latest version

5.19.0-beta.4

Published
3 days ago

- [Overview](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.4)
- [Documentation](https://registry.terraform.io/providers/cloudflare/cloudflare/5.19.0-beta.4/docs)

Use Provider


Browse
cloudflare
documentation


cloudflare
documentation


- [cloudflare provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)

Guides

Resources

Data Sources

# Cloudflare Provider

The Cloudflare provider is used to interact with resources supported by
Cloudflare. The provider needs to be configured with the proper credentials
before it can be used.

## [Getting Started](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs\#getting-started)

Try the [getting started tutorial](https://developers.cloudflare.com/terraform/tutorial/)
on [developers.cloudflare.com](https://developers.cloudflare.com/). In the walk
through, you will setup Terraform and learn to manage Cloudflare resources such
as DNS records, zone settings, load balancers and much more!

## [Example Usage](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs\#example-usage)

```terraform

```

Copy

## [Schema](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs\#schema)

### [Optional](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs\#optional)

- [`api_key`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#api_key-1) (String) The API key for operations. Alternatively, can be configured using the `CLOUDFLARE_API_KEY` environment variable. API keys are [now considered legacy by Cloudflare](https://developers.cloudflare.com/fundamentals/api/get-started/keys/#limitations), API tokens should be used instead. Must provide only one of `api_key`, `api_token`, `api_user_service_key`.
- [`api_token`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#api_token-1) (String) The API Token for operations. Alternatively, can be configured using the `CLOUDFLARE_API_TOKEN` environment variable. Must provide only one of `api_key`, `api_token`, `api_user_service_key`.
- [`api_user_service_key`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#api_user_service_key-1) (String) A special Cloudflare API key good for a restricted set of endpoints. Alternatively, can be configured using the `CLOUDFLARE_API_USER_SERVICE_KEY` environment variable. Must provide only one of `api_key`, `api_token`, `api_user_service_key`.
- [`base_url`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#base_url-1) (String) Value to override the default HTTP client base URL. Alternatively, can be configured using the `base_url` environment variable.
- [`email`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#email-1) (String) A registered Cloudflare email address. Alternatively, can be configured using the `CLOUDFLARE_EMAIL` environment variable. Required when using `api_key`. Conflicts with `api_token`.
- [`user_agent_operator_suffix`](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#user_agent_operator_suffix-1) (String) A value to append to the HTTP User Agent for all API calls. This value is not something most users need to modify however, if you are using a non-standard provider or operator configuration, this is recommended to assist in uniquely identifying your traffic. **Setting this value will remove the Terraform version from the HTTP User Agent string and may have unintended consequences**. Alternatively, can be configured using the `CLOUDFLARE_USER_AGENT_OPERATOR_SUFFIX` environment variable.

#### On this page

- [Getting Started](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#getting-started)
- [Example Usage](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#example-usage)
- [Schema](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs#schema)

[Report an issue](https://github.com/cloudflare/terraform-provider-cloudflare/issues)

[Intro](https://www.terraform.io/intro/index.html) [Learn](https://learn.hashicorp.com/terraform) [Docs](https://www.terraform.io/docs/registry/) [Extend](https://www.terraform.io/docs/extend/index.html) [Community](https://www.terraform.io/community.html) [Status](https://status.hashicorp.com/) [Privacy](https://www.hashicorp.com/privacy) [Security](https://www.terraform.io/security.html) [Terms](https://registry.terraform.io/terms) [Press Kit](https://www.terraform.io/assets/files/press-kit.zip)

iAsset 1© HashiCorp
2026