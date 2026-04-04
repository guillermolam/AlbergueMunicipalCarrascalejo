[Skip to main content](https://docs.projectdiscovery.io/opensource/katana/usage#content-area)

[ProjectDiscovery Documentation home page![light logo](https://mintcdn.com/projectdiscovery/fQ4V6D3pQMrlN6G5/logo/ProjectDiscovery-Logo-OnLight.svg?fit=max&auto=format&n=fQ4V6D3pQMrlN6G5&q=85&s=947b0ba121a849dc6e41ecca24fd5d56)![dark logo](https://mintcdn.com/projectdiscovery/fQ4V6D3pQMrlN6G5/logo/ProjectDiscovery-Logo-OnDark.svg?fit=max&auto=format&n=fQ4V6D3pQMrlN6G5&q=85&s=2286c2fd1736f1c7232b6485feb2a42f)](https://docs.projectdiscovery.io/)

Search...

Ctrl KAsk AI

- [Login](https://cloud.projectdiscovery.io/)
- [Get Started](https://github.com/projectdiscovery/nuclei)
- [Get Started](https://github.com/projectdiscovery/nuclei)

Search...

Navigation

Katana

Katana Usage

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

- [Access help](https://docs.projectdiscovery.io/opensource/katana/usage#access-help)
- [Katana help options](https://docs.projectdiscovery.io/opensource/katana/usage#katana-help-options)

Katana

# Katana Usage

Review Katana usage including flags, configs, and options

## [​](https://docs.projectdiscovery.io/opensource/katana/usage\#access-help)  Access help

Use `katana - h` to display all help options.

## [​](https://docs.projectdiscovery.io/opensource/katana/usage\#katana-help-options)  Katana help options

```
Flags:
INPUT:
   -u, -list string[]  target url / list to crawl

CONFIGURATION:
   -r, -resolvers string[]       list of custom resolver (file or comma separated)
   -d, -depth int                maximum depth to crawl (default 3)
   -jc, -js-crawl                enable endpoint parsing / crawling in javascript file
   -jsl, -jsluice                 enable jsluice parsing in javascript file (memory intensive)
   -ct, -crawl-duration value    maximum duration to crawl the target for (s, m, h, d) (default s)
   -kf, -known-files string      enable crawling of known files (all,robotstxt,sitemapxml)
   -mrs, -max-response-size int  maximum response size to read (default 9223372036854775807)
   -timeout int                  time to wait for request in seconds (default 10)
   -aff, -automatic-form-fill    enable automatic form filling (experimental)
   -fx, -form-extraction         extract form, input, textarea & select elements in jsonl output
   -retry int                    number of times to retry the request (default 1)
   -proxy string                 http/socks5 proxy to use
   -H, -headers string[]         custom header/cookie to include in all http request in header:value format (file)
   -config string                path to the katana configuration file
   -fc, -form-config string      path to custom form configuration file
   -flc, -field-config string    path to custom field configuration file
   -s, -strategy string          Visit strategy (depth-first, breadth-first) (default "depth-first")
   -iqp, -ignore-query-params    Ignore crawling same path with different query-param values
   -tlsi, -tls-impersonate       enable experimental client hello (ja3) tls randomization

DEBUG:
   -health-check, -hc        run diagnostic check up
   -elog, -error-log string  file to write sent requests error log

HEADLESS:
   -hl, -headless                    enable headless hybrid crawling (experimental)
   -sc, -system-chrome               use local installed chrome browser instead of katana installed
   -sb, -show-browser                show the browser on the screen with headless mode
   -ho, -headless-options string[]   start headless chrome with additional options
   -nos, -no-sandbox                 start headless chrome in --no-sandbox mode
   -cdd, -chrome-data-dir string     path to store chrome browser data
   -scp, -system-chrome-path string  use specified chrome browser for headless crawling
   -noi, -no-incognito               start headless chrome without incognito mode
   -cwu, -chrome-ws-url string       use chrome browser instance launched elsewhere with the debugger listening at this URL
   -xhr, -xhr-extraction             extract xhr request url,method in jsonl output

SCOPE:
   -cs, -crawl-scope string[]       in scope url regex to be followed by crawler
   -cos, -crawl-out-scope string[]  out of scope url regex to be excluded by crawler
   -fs, -field-scope string  pre-defined scope field (dn,rdn,fqdn) or custom regex (e.g., '(company-staging.io|company.com)') (default "rdn")
   -ns, -no-scope                   disables host based default scope
   -do, -display-out-scope          display external endpoint from scoped crawling

FILTER:
   -mr, -match-regex string[]       regex or list of regex to match on output url (cli, file)
   -fr, -filter-regex string[]      regex or list of regex to filter on output url (cli, file)
   -f, -field string                field to display in output (url,path,fqdn,rdn,rurl,qurl,qpath,file,ufile,key,value,kv,dir,udir)
   -sf, -store-field string         field to store in per-host output (url,path,fqdn,rdn,rurl,qurl,qpath,file,ufile,key,value,kv,dir,udir)
   -em, -extension-match string[]   match output for given extension (eg, -em php,html,js)
   -ef, -extension-filter string[]  filter output for given extension (eg, -ef png,css)
   -mdc, -match-condition string    match response with dsl based condition
   -fdc, -filter-condition string   filter response with dsl based condition

RATE-LIMIT:
   -c, -concurrency int          number of concurrent fetchers to use (default 10)
   -p, -parallelism int          number of concurrent inputs to process (default 10)
   -rd, -delay int               request delay between each request in seconds
   -rl, -rate-limit int          maximum requests to send per second (default 150)
   -rlm, -rate-limit-minute int  maximum number of requests to send per minute

UPDATE:
   -up, -update                 update katana to latest version
   -duc, -disable-update-check  disable automatic katana update check

OUTPUT:
   -o, -output string                file to write output to
   -sr, -store-response              store http requests/responses
   -srd, -store-response-dir string  store http requests/responses to custom directory
   -or, -omit-raw                    omit raw requests/responses from jsonl output
   -ob, -omit-body                   omit response body from jsonl output
   -j, -jsonl                        write output in jsonl format
   -nc, -no-color                    disable output content coloring (ANSI escape codes)
   -silent                           display output only
   -v, -verbose                      display verbose output
   -debug                            display debug output
   -version                          display project version
```

Was this page helpful?

YesNo

[Suggest edits](https://github.com/projectdiscovery/docs/edit/main/opensource/katana/usage.mdx) [Raise issue](https://github.com/projectdiscovery/docs/issues/new?title=Issue%20on%20docs&body=Path:%20/opensource/katana/usage)

[Install](https://docs.projectdiscovery.io/opensource/katana/install) [Running](https://docs.projectdiscovery.io/opensource/katana/running)

Ctrl+I

[github](https://github.com/projectdiscovery) [twitter](https://twitter.com/pdiscoveryio) [discord](https://discord.com/invite/projectdiscovery) [linkedin](https://www.linkedin.com/company/projectdiscovery) [youtube](https://www.youtube.com/@projectdiscovery)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com/?utm_campaign=poweredBy&utm_medium=referral&utm_source=projectdiscovery)

Assistant

Responses are generated using AI and may contain mistakes.