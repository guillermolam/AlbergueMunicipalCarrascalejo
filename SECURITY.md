# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

This project follows trunk-based development. Only the `main` branch receives
security updates.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report vulnerabilities privately via one of these channels:

1. **GitHub Security Advisories** (preferred):
   [Report a vulnerability](https://github.com/guillermolam/AlbergueMunicipalCarrascalejo/security/advisories/new)

2. **Email**: Send details to the repository owner via the email listed on the
   GitHub profile [@guillermolam](https://github.com/guillermolam).

Include as much of the following as possible:

- Description of the vulnerability
- Steps to reproduce or proof of concept
- Affected component (frontend, backend service name, gateway, infra)
- Potential impact assessment
- Suggested fix (if any)

## Response Timeline

| Action                | Target   |
| --------------------- | -------- |
| Acknowledgement       | 48 hours |
| Initial triage        | 5 days   |
| Fix for critical/high | 14 days  |
| Fix for medium/low    | 30 days  |

## Security Architecture

### Runtime Targets

| Target             | Isolation Model                             |
| ------------------ | ------------------------------------------- |
| Cloudflare Workers | V8 isolate sandbox (wasm32-unknown-unknown) |
| Spin / Fermyon     | Wasm component sandbox (wasm32-wasip2)      |
| Oracle Cloud (OCI) | Docker container on ARM (Always Free)       |

### Automated Security Controls

- **OPA Rego policies** (`security/policies/`): 22 rules enforced at pre-commit
  and commit-msg hooks, covering dependency bans, secret detection, file
  integrity, permission monitoring, and anti-bypass protections.
- **Trunk**: Static analysis, linting, and formatting on every commit.
- **GitHub CodeQL**: SAST scanning on push and pull requests.
- **Dependabot**: Daily dependency updates for npm, Cargo, GitHub Actions,
  Terraform, Go, and Docker ecosystems.
- **Branch protection**: PRs required for `main`, dismiss stale reviews enabled.

### Policy Framework (OPA)

| Policy | Description                                    |
| ------ | ---------------------------------------------- |
| P001   | No Tailwind CSS references                     |
| P002   | No unauthorized root directories               |
| P003   | No emojis in source files                      |
| P005   | Workers must not import spin-sdk               |
| P006   | Spin services must not import worker crate     |
| P007   | Conventional commit messages                   |
| P008   | No lazy stub patterns                          |
| P009   | No secrets in committed files                  |
| P010   | No React anywhere                              |
| P011   | No Tailwind-compat UnoCSS presets              |
| P012   | Trunk-based development enforcement            |
| P013   | Test coverage >= 95%                           |
| P014   | .gitignore integrity                           |
| P015   | security/policies/ read-only for agents        |
| P016   | File permission (chmod) monitoring             |
| P017   | Protected config file review                   |
| P018   | No hiding source from scanners via .gitignore  |
| P019   | No mass lint/security suppressions             |
| P020   | No weakening scanner configs                   |
| P021   | No deleting test files                         |
| P022   | No large files (>50 MB) or banned binary types |

### Secrets Management

- All secrets are stored in GitHub Actions encrypted secrets or Spacelift
  contexts. No secrets are committed to the repository (enforced by P009).
- Terraform state is managed remotely (Terraform Cloud / Spacelift).
- OCI credentials use API key authentication with key rotation policy.

## Disclosure Policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
We will credit reporters in the advisory unless they prefer to remain anonymous.
