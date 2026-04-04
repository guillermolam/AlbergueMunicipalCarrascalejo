[Skip to main content](https://docs.projectdiscovery.io/opensource/katana/install#content-area)

[ProjectDiscovery Documentation home page![light logo](https://mintcdn.com/projectdiscovery/fQ4V6D3pQMrlN6G5/logo/ProjectDiscovery-Logo-OnLight.svg?fit=max&auto=format&n=fQ4V6D3pQMrlN6G5&q=85&s=947b0ba121a849dc6e41ecca24fd5d56)![dark logo](https://mintcdn.com/projectdiscovery/fQ4V6D3pQMrlN6G5/logo/ProjectDiscovery-Logo-OnDark.svg?fit=max&auto=format&n=fQ4V6D3pQMrlN6G5&q=85&s=2286c2fd1736f1c7232b6485feb2a42f)](https://docs.projectdiscovery.io/)

Search...

Ctrl KAsk AI

- [Login](https://cloud.projectdiscovery.io/)
- [Get Started](https://github.com/projectdiscovery/nuclei)
- [Get Started](https://github.com/projectdiscovery/nuclei)

Search...

Navigation

Katana

Installing Katana

[Home](https://docs.projectdiscovery.io/home) [Quick Start](https://docs.projectdiscovery.io/quickstart) [Cloud Platform](https://docs.projectdiscovery.io/cloud/introduction) [API Reference](https://docs.projectdiscovery.io/api-reference/introduction) [Open Source](https://docs.projectdiscovery.io/opensource) [Templates](https://docs.projectdiscovery.io/templates/introduction)

- [GitHub](https://github.com/projectdiscovery)
- [Website](https://projectdiscovery.io/)
- [Community](https://projectdiscovery.io/community)

##### Open Source

- [Overview](https://docs.projectdiscovery.io/opensource)
- AlterX

- Chaos

- Cloudlist

- cvemap

- dnsx

- httpx

- Interactsh

- Katana

  - [Overview](https://docs.projectdiscovery.io/opensource/katana/overview)
  - [Install](https://docs.projectdiscovery.io/opensource/katana/install)
  - [Usage](https://docs.projectdiscovery.io/opensource/katana/usage)
  - [Running](https://docs.projectdiscovery.io/opensource/katana/running)
- Naabu

- Notify

- Nuclei

- PDTM

- Subfinder

- uncover


On this page

- [Installation Notes](https://docs.projectdiscovery.io/opensource/katana/install#installation-notes)

Katana

# Installing Katana

Learn about how to install Katana

- Go

- Docker

- GitHub

- Ubuntu

- Binary


Enter the command below in a terminal to install ProjectDiscovery’s Katana using Go.

```
go install github.com/projectdiscovery/katana/cmd/katana@latest
```

Enter the command below in a terminal to install ProjectDiscovery’s Katana using Go.

To install/update Docker to the latest tag

```
docker pull projectdiscovery/katana:latest
```

Enter the command below in a terminal to install ProjectDiscovery’s Katana using GitHub.

```
go install github.com/projectdiscovery/katana/cmd/katana@latest
```

For running Ubuntu we recommend installing the following prerequisits

```
sudo apt update
sudo snap refresh
sudo apt install zip curl wget git
sudo snap install golang --classic
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt update
sudo apt install google-chrome-stable
```

```
https://github.com/projectdiscovery/katana/releases
```

- Download the latest binary for your OS.
- Unzip the file to run binary.

## [​](https://docs.projectdiscovery.io/opensource/katana/install\#installation-notes)  Installation Notes

- Katana requires the latest version of [**Go**](https://go.dev/doc/install)
- Add the Go bin path to the system paths. On OSX or Linux, in your terminal use

```
echo export $PATH=$PATH:$HOME/go/bin >> $home/.bashrc
source $home/.bashrc
```

- To add the Go bin path in Windows, [click this link for instructions.](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/)
- The binary will be located in `$home/go/bin/katana`

Was this page helpful?

YesNo

[Suggest edits](https://github.com/projectdiscovery/docs/edit/main/opensource/katana/install.mdx) [Raise issue](https://github.com/projectdiscovery/docs/issues/new?title=Issue%20on%20docs&body=Path:%20/opensource/katana/install)

[Overview](https://docs.projectdiscovery.io/opensource/katana/overview) [Usage](https://docs.projectdiscovery.io/opensource/katana/usage)

Ctrl+I

[github](https://github.com/projectdiscovery) [twitter](https://twitter.com/pdiscoveryio) [discord](https://discord.com/invite/projectdiscovery) [linkedin](https://www.linkedin.com/company/projectdiscovery) [youtube](https://www.youtube.com/@projectdiscovery)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com/?utm_campaign=poweredBy&utm_medium=referral&utm_source=projectdiscovery)

Assistant

Responses are generated using AI and may contain mistakes.