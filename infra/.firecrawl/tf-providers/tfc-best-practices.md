[Skip to main content](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices#main)

[HashiConf 2025Don't miss the live stream of HashiConf Day 2 happening nowView live stream](https://www.hashicorp.com/conferences/hashiconf#livestream)

HashiCorp Cloud Platform

Get started in minutes with our cloud products

[All HCP Products](https://developer.hashicorp.com/hcp)

- Infrastructure Lifecycle Management
  - [TerraformManage infrastructure as code](https://developer.hashicorp.com/terraform)
  - [PackerBuild machine images](https://developer.hashicorp.com/packer)
  - [NomadOrchestrate workloads](https://developer.hashicorp.com/nomad)
  - [WaypointStandardize application patterns](https://developer.hashicorp.com/waypoint)
  - [VagrantBuild developer environments](https://developer.hashicorp.com/vagrant)
- Security Lifecycle Management
  - [VaultCentrally manage secrets](https://developer.hashicorp.com/vault)
  - [BoundarySecure remote access](https://developer.hashicorp.com/boundary)
  - [Vault Radar\\
    \\
    Scan for embedded secrets](https://developer.hashicorp.com/hcp/docs/vault-radar)
  - [ConsulSecure network services](https://developer.hashicorp.com/consul)

Learn

- [CertificationsGet HashiCorp certified](https://developer.hashicorp.com/certifications)
- [TutorialsLearn HashiCorp products](https://developer.hashicorp.com/tutorials)
- [Validated PatternsField-tested patterns for using HashiCorp products](https://developer.hashicorp.com/validated-patterns)
- [Well-Architected FrameworkAdopt HashiCorp best practices](https://developer.hashicorp.com/well-architected-framework)

[Terraform](https://developer.hashicorp.com/terraform)

- [Install](https://developer.hashicorp.com/terraform/install)
- [Tutorials](https://developer.hashicorp.com/terraform/tutorials)
- Documentation







  - [Documentation](https://developer.hashicorp.com/terraform/docs)
  - [Intro to Terraform](https://developer.hashicorp.com/terraform/intro)
  - [Configuration Language](https://developer.hashicorp.com/terraform/language)
  - [Terraform CLI](https://developer.hashicorp.com/terraform/cli)
  - [HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs)
  - [Terraform Enterprise](https://developer.hashicorp.com/terraform/enterprise)
  - [Terraform MCP Server\\
    \\
    BETA](https://developer.hashicorp.com/terraform/mcp-server)
  - [Terraform Migrate](https://developer.hashicorp.com/terraform/migrate)
  - [Provider Use](https://developer.hashicorp.com/terraform/language/providers)
  - [Plugin Development](https://developer.hashicorp.com/terraform/plugin)
  - [Registry Publishing](https://developer.hashicorp.com/terraform/registry)
  - [Integration Program](https://developer.hashicorp.com/terraform/docs/partnerships)

- Sandbox

- [Registry](https://registry.terraform.io/)(opens in new tab)
- [Try Cloud](https://app.terraform.io/public/signup/account)(opens in new tab)

Search

⌘/ctrl

Command or control key

K

K key

- Sign in
- [Sign up](https://developer.hashicorp.com/sign-up)
- * * *

- Theme
DarkLightSystem


Sign In [Sign Up](https://developer.hashicorp.com/sign-up)

Theme

DarkLightSystem

[Terraform Home](https://developer.hashicorp.com/terraform)

## HCP Terraform

- [HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs)
- Plans and features

- [Get started](https://developer.hashicorp.com/terraform/tutorials/cloud-get-started?utm_source=WEBSITE&utm_medium=WEB_IO&utm_offer=ARTICLE_PAGE&utm_content=DOCS)
- [Migrate to HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs/migrate)
- [Use HCP Terraform in Europe](https://developer.hashicorp.com/terraform/cloud-docs/europe)
- Manage access and organizations

- Private registry

- Scope access with projects

- Connecting to VCS

- [Compare Stacks and workspaces](https://developer.hashicorp.com/terraform/cloud-docs/stack-workspace)
- Use workspaces

- Use Stacks

- Recommended practices


  - [Overview](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices)
  - [Part 1: Overview of our recommended workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part1)
  - [Part 2: Evaluating your current provisioning practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2)
  - [Part 3: How to evolve your provisioning practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3)
  - [Part 3.1: From manual changes to semi-automation](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.1)
  - [Part 3.2: From semi-automation to infrastructure as code](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.2)
  - [Part 3.3: From infrastructure as code to collaborative infrastructure as code](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.3)
  - [Part 3.4: Advanced workflow improvements](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.4)
- * * *

- ### REFERENCE

- API

- System architecture

- * * *

- [HCP Terraform agents](https://developer.hashicorp.com/terraform/cloud-docs/agents)

* * *

- ### Resources

- [Tutorial Library](https://developer.hashicorp.com/tutorials/library?product=terraform)
- [Certifications](https://developer.hashicorp.com/certifications/infrastructure-automation)
- [Sandbox](https://developer.hashicorp.com/terraform/sandbox)
- [Community Forum](https://discuss.hashicorp.com/c/terraform-core/27)(opens in new tab)
- [Support](https://www.ibm.com/mysupport)(opens in new tab)
- [GitHub](https://github.com/hashicorp/terraform)(opens in new tab)
- [Terraform Registry](https://registry.terraform.io/)(opens in new tab)

1. [Developer](https://developer.hashicorp.com/)
2. [Terraform](https://developer.hashicorp.com/terraform)
3. [HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs)
4. Recommended practices

# Learn Terraform recommended practices

This guide is meant for enterprise users looking to advance their Terraform
usage from a few individuals to a full organization. For Terraform code style
recommended practices, refer to the [Terraform style guide](https://developer.hashicorp.com/terraform/language/style).

## [introduction permalink](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices\#introduction) Introduction

HashiCorp specializes in helping IT organizations adopt cloud technologies. Based on what we've seen work well, we believe the best approach to provisioning is **collaborative infrastructure as code,** using Terraform as the core workflow and HCP Terraform to manage the boundaries between your organization's different teams, roles, applications, and deployment tiers.

The collaborative infrastructure as code workflow is built on many other IT best practices (like using version control and preventing manual changes), and you must adopt these foundations before you can fully adopt our recommended workflow. Achieving state-of-the-art provisioning practices is a journey, with several distinct stops along the way.

HashiCorp Terraform Adoption Stages - YouTube

Tap to unmute

[HashiCorp Terraform Adoption Stages](https://www.youtube.com/watch?v=FWpCQar9dYg) [HashiCorp, an IBM Company](https://www.youtube.com/channel/UC-AdvAxaagE9W2f0webyNUQ)

HashiCorp, an IBM Company71.2K subscribers

[Watch on](https://www.youtube.com/watch?v=FWpCQar9dYg)

This guide describes our recommended Terraform practices and how to adopt them. It covers the steps to start using our tools, with special attention to the foundational practices they rely on.

- [Part 1: An Overview of Our Recommended Workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part1) is a holistic overview of HCP Terraform's collaborative infrastructure as code workflow. It describes how infrastructure is organized and governed, and how people interact with it.

- [Part 2: Evaluating Your Current Provisioning Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2) is a series of questions to help you evaluate the state of your own infrastructure provisioning practices. We define four stages of operational maturity around provisioning to help you orient yourself and understand which foundational practices you still need to adopt.

- [Part 3: How to Evolve Your Provisioning Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3) is a guide for how to advance your provisioning practices through the four stages of operational maturity. Many organizations are already partway through this process, so use what you learned in part 2 to determine where you are in this journey.

This part is split into four pages:

  - [Part 3.1: How to Move from Manual Changes to Semi-Automation](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.1)
  - [Part 3.2: How to Move from Semi-Automation to Infrastructure as Code](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.2)
  - [Part 3.3: How to Move from Infrastructure as Code to Collaborative Infrastructure as Code](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.3)
  - [Part 3.4: Advanced Improvements to Collaborative Infrastructure as Code](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.4)

## [next permalink](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices\#next) Next

Begin reading with [Part 1: An Overview of Our Recommended Workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part1).

[Edit this page on GitHub](https://github.com/hashicorp/web-unified-docs/blob/main/content/terraform-docs-common//docs/cloud-docs/recommended-practices/index.mdx)

On this page:

1. [Learn Terraform recommended practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices#learn-terraform-recommended-practices)
2. [Introduction](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices#introduction)
3. [Next](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices#next)

[Go to HashiCorp home page](https://www.hashicorp.com/) Theme
DarkLightSystem

- [Certifications](https://developer.hashicorp.com/certifications)
- [System Status](https://status.hashicorp.com/)
- Cookie Manager
- [Terms of Use](https://www.hashicorp.com/terms-of-service)
- [Security](https://www.hashicorp.com/trust/security)
- [Privacy](https://www.hashicorp.com/privacy)
- [Trademark Policy](https://www.hashicorp.com/trademark-policy)
- [Trade Controls](https://www.hashicorp.com/trade-controls)
- [Accessibility](https://www.hashicorp.com/trust/accessibility)
- [Give Feedback](https://forms.gle/fnHLuNahLEhjuKvE6)(opens in new tab)
- stdin is not a tty