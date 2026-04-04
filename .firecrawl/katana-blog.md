[ProjectDiscovery![ProjectDiscovery Logo](https://projectdiscovery.io/_next/static/media/ProjectDiscoveryLogo.a524f50f.svg)](https://projectdiscovery.io/)

Solutions▾

[AI Pentesting](https://projectdiscovery.io/solutions/ai-pentesting) [PR Security Review](https://projectdiscovery.io/solutions/pr-security-review) [Threat Modeling](https://projectdiscovery.io/solutions/threat-modeling) [Vulnerability Remediation](https://projectdiscovery.io/solutions/vulnerability-remediation) [Exposure Analysis](https://projectdiscovery.io/solutions/exposure-analysis)

Resources▾

[Blog](https://projectdiscovery.io/blog) [2026 AppSec Report](https://projectdiscovery.io/whitepapers/application-security-report-2026) [2026 ASM Report](https://projectdiscovery.io/whitepapers/attack-surface-management-2025)

Sign In▾

[Neo](https://neo.projectdiscovery.io/sign-in) [Cloud](https://cloud.projectdiscovery.io/sign-in)

[Request demo](https://projectdiscovery.io/request-demo) Open menu

[Blog](https://projectdiscovery.io/blog)

[Stories](https://projectdiscovery.io/blog/stories/1) [Categories](https://projectdiscovery.io/blog/categories) [Authors](https://projectdiscovery.io/blog/authors)

Feb 13, 2023\-

9 min read

# Introducing Katana: The CLI web crawler from PD

[Attack Surface Management](https://projectdiscovery.io/blog/category/attack-surface-management/1) [Community & Open Source](https://projectdiscovery.io/blog/category/community-open-source/1)

![Introducing Katana: The CLI web crawler from PD](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2024%2F11%2FBlog---Introducing-Katana.png&w=828&q=75)

#### Table of Contents

- [What is Katana?](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#what-is-katana "What is Katana?")
- [Tool integrations](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#tool-integrations "Tool integrations")
- [What is web crawling?](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#what-is-web-crawling "What is web crawling?")
- [Installation](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#installation "Installation")
- [Binary](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#binary "Binary")
- [Docker](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#docker "Docker")
- [Options](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#options "Options")
- [Configuration](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#configuration "Configuration")
- [Headless](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#headless "Headless")
- [Scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#scope "Scope")
- [Filter](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#filter "Filter")
- [Rate-limit](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#rate-limit "Rate-limit")
- [Output](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#output "Output")
- [Different inputs](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#different-inputs "Different inputs")
- [Crawling modes](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#crawling-modes "Crawling modes")
- [Standard mode](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#standard-mode "Standard mode")
- [Headless mode](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#headless-mode "Headless mode")
- [Controlling your scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#controlling-your-scope "Controlling your scope")
- [Field-scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#field-scope "Field-scope")
- [Crawl-scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#crawl-scope "Crawl-scope")
- [Crawl-out-scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#crawl-out-scope "Crawl-out-scope")
- [No-scope](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#no-scope "No-scope")
- [Making Katana a crawler for you with configuration](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#making-katana-a-crawler-for-you-with-configuration "Making Katana a crawler for you with configuration")
- [Depth](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#depth "Depth")
- [Crawling JavaScript](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#crawling-javascript "Crawling JavaScript")
- [Crawl duration](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#crawl-duration "Crawl duration")
- [Known files](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#known-files "Known files")
- [Automatic form fill](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#automatic-form-fill "Automatic form fill")
- [Handling your output](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#handling-your-output "Handling your output")
- [Field](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#field "Field")
- [Store-field](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#store-field "Store-field")
- [Extension-match & extension-filter](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#extension-match-extension-filter "Extension-match & extension-filter")
- [JSON](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#json "JSON")
- [Rate limiting and delays](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#rate-limiting-and-delays "Rate limiting and delays")
- [Delay](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#delay "Delay")
- [Concurrency](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#concurrency "Concurrency")
- [Parallelism](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#parallelism "Parallelism")
- [Rate-limit](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#rate-limit-1 "Rate-limit")
- [Rate-limit-minute](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#rate-limit-minute "Rate-limit-minute")
- [Chaining Katana with other ProjectDiscovery tools](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#chaining-katana-with-other-projectdiscovery-tools "Chaining Katana with other ProjectDiscovery tools")
- [Conclusion](https://projectdiscovery.io/blog/introducing-katana-the-best-cli-web-crawler#conclusion "Conclusion")

#### Authors

[![ProjectDiscovery](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2025%2F04%2FProjectDiscovery_Primary_Logo_Mark_onDark-2.png&w=96&q=75)\\
\\
**ProjectDiscovery**](https://projectdiscovery.io/blog/author/projectdiscovery/1)

#### Share

## What is Katana?

Katana is a command-line interface (CLI) web crawling tool written in Golang. It is designed to crawl websites to gather information and endpoints. One of the defining features of Katana is its ability to use headless browsing to crawl applications. This means that it can crawl single-page applications (SPAs) built using technologies such as JavaScript, Angular, or React. These types of applications are becoming increasingly common, but can be difficult to crawl using traditional tools. By using headless browsing, Katana is able to access and gather information from these types of applications more effectively.

Katana is designed to be CLI-friendly, fast, efficient and with a simple output format. This makes it an attractive option for those looking to use the tool as part of an automation pipeline. Furthermore, regular updates and maintenance ensure that this tool remains a valuable and indispensable part of your hacker arsenal for years to come.

## Tool integrations

Katana is an excellent tool for several reasons, one of which is its simple input/output formats. These formats are easy to understand and use, allowing users to quickly and easily integrate Katana into their workflow. Katana is designed to be easily integrated with other tools in the ProjectDiscovery suite, as well as other widely used CLI-based recon tools.

## What is web crawling?

Any search engine you use today is populated using web crawlers. A web crawler indexes web applications by automating the “click every button” approach to discovering paths, scripts and other resources. Web application indexing is an important step in uncovering an application’s attack surface.

## Installation

Katana allows a couple of different installation methods, downloading the pre-compiled binary, compiling the binary using go, or docker.

### Binary

There are two ways to install the binary directly onto your system:

1. Download the pre-compiled binary from the [release page](https://github.com/projectdiscovery/katana/releases).
2. Run go install:

cli

Copy

```bash
1go install github.com/projectdiscovery/katana/cmd/katana@latest
```

### Docker

1. Install/Update docker image to the latest tag

cli

Copy

```bash
1docker pull projectdiscovery/katana:latest
```

2\. Running Katana

a. Normal mode:

cli

Copy

```bash
1docker run projectdiscovery/katana:latest -u https://tesla.com
```

b. Headless mode:

cli

Copy

```bash
1docker run projectdiscovery/katana:latest -u https://tesla.com -system-chrome -headless
```

## Options

Here are the raw options for your perusal – we'll take a closer look at each below!

### Configuration

`-d, -depth` Defines maximum crawl depth, ex: `-d 2
-jc, -js-crawl` Enables endpoint parsing/crawling from JS files

`-ct, -crawl-duration` Maximum time to crawl the target for, ex: `-ct 100
-kf, -known-files` Enable crawling for known files, ex: `all,robotstxt,sitemapxml, etc.
-mrs, -max-response-size` Maximum response size to read, ex: `-mrs 200000
-timeout` Time to wait for request in seconds, ex: `-timeout 5
-aff, -automatic-form-fill` Enable optional automatic form filling. This is still experimental

`-retry` Number of times to retry the request, ex: `-retry 2
-proxy` HTTP/socks5 proxy to use, ex: `-proxy http://127.0.0.1:8080
-H, -headers` Include custom headers/cookies with your request, ex: `TODO
-config` Path to the katana configuration file, ex: `-config /home/g0lden/katana-config.yaml
-fc, -form-config` Path to form configuration file, ex: `-fc /home/g0lden/form-config.yaml`

### Headless

`-hl, -headless` Enable headless hybrid crawling. This is experimental

`-sc, -system-chrome` Use a locally installed Chrome browser instead of katana’s

`-sb, -show-browser` Show the browser on screen when in headless mode

`-ho, -headless-options` Start headless chrome with additional options

`-nos, -no-sandbox` Start headless chrome in --no-sandbox mode

### Scope

`-cs, -crawl-scope` In-scope URL regex to be followed by crawler, ex: `-cs login
-cos, -crawl-out-scope` Out-of-scope url regex to be excluded by crawler, ex: `-cos logout
-fs, -field-scope` Pre-defined scope field (dn,rdn,fqdn), ex: `-fs dn
-ns, -no-scope` Disables host-based default scope allowing for internet scanning

`-do, -display-out-scope` Display external endpoints found from crawling

### Filter

`-f, -field` Field to display in output (url,path,fqdn,rdn,rurl,qurl,qpath,file,key,value,kv,dir,udir), ex: `-f qurl
-sf, -store-field` Field to store in selected output option (url,path,fqdn,rdn,rurl,qurl,qpath,file,key,value,kv,dir,udir), ex: `-sf qurl
-em, -extension-match` Match output for given extension, ex: `-em php,html,js
-ef, -extension-filter` Filter output for given extension, ex: `-ef png,css`

### Rate-limit

`-c, -concurrency` Number of concurrent fetchers to use, ex: `-c 50
-p, -parallelism` Number of concurrent inputs to process, ex: `-p 50
-rd, -delay` Request delay between each request in seconds, ex: `-rd 3
-rl, -rate-limit` Maximum requests to send per second, ex: `-rl 150
-rlm, -rate-limit-minute` Maximum number of requests to send per minute, ex: `-rlm 1000`

### Output

`-o, -output` File to write output to, ex: `-o findings.txt
-j, -json` Write output in JSONL(ines) format

`-nc, -no-color` Disable output content coloring (ANSI escape codes)

`-silent` Display output only

`-v, -verbose` Display verbose output

`-version` Display project version

## Different inputs

There are four different ways to give katana input:

1. **URL input**

cli

Copy

```bash
1katana -u https://tesla.com
```

2\. **Multiple URL input**

cli

Copy

```bash
1katana -u https://tesla.com,https://google.com
```

3\. **List input**

cli

Copy

```bash
1katana -list url_list.txt
```

4\. **STDIN input (piped)**

cli

Copy

```bash
1echo “https://tesla.com” | katana
```

## Crawling modes

### Standard mode

Standard mode uses the standard Golang HTTP library to make requests. The upside of this mode is that there is no browser overhead, so it’s much faster than headless mode. The downside is that the HTTP library in Go analyzes the HTTP response as is and any dynamic JavaScript or DOM ( [Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)) manipulations won’t load, causing you to miss post-rendered endpoints or asynchronous endpoint calls.

If you are confident the application you are crawling does not use complex DOM rendering or has asynchronous events, then this mode is the one to use as it is faster. Standard mode is the default:

cli

Copy

```bash
1katana -u https://tesla.com
```

### Headless mode

Headless mode uses internal headless calls to handle HTTP requests/responses within a browser context. This solves two major issues:

- The HTTP fingerprint from a headless browser will be identified and accepted as a real browser – including TLS and user agent.
- Better coverage by analyzing raw HTTP responses as well as the browser-rendered response with JavaScript.

If you are crawling a modern complex application that utilizes DOM manipulation and/or asynchronous events, consider using headless mode by utilizing the `-headless` option:

cli

Copy

```bash
1katana -u https://tesla.com -headless
```

## Controlling your scope

Controlling your scope is important to returning valuable results. Katana has four main ways to control the scope of your crawl:

- Field-scope
- Crawl-scope
- Crawl-out-scope
- No-scope

### Field-scope

When setting the field scope, you have three options:

1. **_rdn_**\- crawling scoped to root domain name and all subdomains (default)
2. Running `katana -u https://tesla.com -fs dn` returns anything that matches \*.tesla.com

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh4.googleusercontent.com%2FXvjc91C0IAqTYAUui65CFzDVoD4SO1_NwUuDwkXiPRv9C42PaZNxsOXiBNP8QmrwjUG0LEQzGcxtlONB1Gk2Eu_G4Y1vykHGXmZYosC1oRN_j1U0zdE91MQ9IFvl9OHBYYZs3JTVHAJbyOg8nx9XxcvgW14GTYyO62xV7QBJXl2JgN-SzI_aKZCyUkDYqA&w=3840&q=75)

1. **_fqdn_** \- crawling scoped to given sub(domain)

a. Running `katana -u https://tesla.com -fs fqdn` returns nothing because no URLs containing only “tesla.com” are found

b. Running `katana -u https://www.tesla.com -fs fqdn` only returns URLs that are on the “www.tesla.com” domain.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh4.googleusercontent.com%2Fj0c6PUOovJfgZHROddXtL2y80MwCjAOG-4hYuFREHe9V-codUfsWyB5ts6tVVtBZNp43_XlVGI_ZlUxbqMsvVoQ9w6CyGRDQ_lsFEw-GjroXZIS5t5G1c1vwTNlLyPy9GTuqDwjQ_PwWeHOHmhRfTOcVXZQz-gSCwDTKsg1qFN8pYJgQoeeH-CcXjBcvXQ&w=3840&q=75)

1. **_dn_** \- crawling scoped to domain name keyword

a. Running `katana -u https://tesla.com -fs dn` returns anything that contains the domain name itself. In this example, that is “tesla”. Notice how the results returned a totally new domain suppliers.teslamotors.com

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh5.googleusercontent.com%2FExIZzd4ucgwuk0JkLElU-tEJBVwx48kDZgnqFHC6FtCg1ujq29WyD1rk8KP1Uv97xJs5d6TU27xCEWkW8tRySgx3NPh2D4tqJaqixwi7B_NhgxrwjLvQ2qdXlkuGJgIy6gWFLa_Nt2khXWeJ-y4ror_xdHSPdVXY7M6RptfdR7CJDn-4s-EuwuIuwJwkYQ&w=3840&q=75)

### Crawl-scope

The crawl-scope (-cs) flag works as a regex filter, only returning matching URLs. Look at what happens when filtering for “shop” on tesla.com. Only results with the word “shop” are returned.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh5.googleusercontent.com%2Fa_KGJNB_zYGUrq9QlSGH_eo_4fN0bwvz_aPSolgZKfcKJLIsoutZRAA2Tv0ZgN6xdIic6bNM3QgfQdX4aFPaMeBJzdwDpybAz8vBg6HuD_cS0CNeiRPfLCqKUv1z3qbqNDrK2dj0diPpbzFTnXM5wiJQZNmdKGWiyBfK0TqxcPhaN9vnbnQeRG8YGKEefg&w=3840&q=75)

### Crawl-out-scope

Similarly, the crawl-out-scope (-cos) flag works as a filter that will remove any urls that match the regex given after the flag. Filtering for “shop” removes all urls that contain the string “shop” from the output.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh3.googleusercontent.com%2F-E-Okx-XQhrtk6xOQpjaMmL8-hvw1TLgWvLIN7wsCBP2qA9NX4tCkYx8UV2vbPx431gtBieR6LXtxbhGeyTcrIYQUm0PB8SmzwVWDlVVE6YGahnUSmVwyhq7P9ZznJI-JLInmBQU6mcAxykoZrYIigS86vHjWQJwjFVpvokjjKYiQfgHsD1sHWbKlS-RYw&w=3840&q=75)

### No-scope

Setting the no-scope flag will allow the crawler to start at the target and crawl the internet. Running `katana -u https://tesla.com -ns` will pick up other domains that are not on the beginning target site “tesla.com” as the crawler will crawl any links it finds.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh4.googleusercontent.com%2FKd_8Jv4DIyoZwy9H4FFDEz-3ZvY6bNPsn9ngIKTBQdsLuV7RZHDzerDnR_Iqlk-4CCZqEuI_T4ZWnfcC6xoVAIc2_kNFrpZoPZWqG4eX_CYPhft5rLqB0S3unQht-1He2PJXpOf_GQG6uvOcTT28WTY2SSeLR-iz0DR_zIJLpwKzt8rj65c42k7occsI5g&w=3840&q=75)

## Making Katana a crawler for you with configuration

### Depth

Define the depth of your crawl. The higher the depth, the more recursive crawls you will get. Be aware this can lead to long crawl times against large web applications.

cli

Copy

```bash
1katana -u https://tesla.com -d 5
```

### Crawling JavaScript

For web applications with handfuls of JavaScript files, turn on JavaScript parsing/crawling. This is turned off by default, but turning this on will allow the crawler to crawl and parse JavaScript files. These files can be hiding all kinds of useful endpoints.

cli

Copy

```bash
1katana -u https://tesla.com -jc
```

### Crawl duration

Set a predefined crawl duration and the crawler will return all URLs it finds in the specified time.

cli

Copy

```bash
1katana -u https://tesla.com -ct 2
```

### Known files

Find and crawl any robots.txt or sitemap.xml files that are present. This functionality is turned off by default.

cli

Copy

```bash
1katana -u https://tesla.com -kf robotstxt,sitemapxml
```

### Automatic form fill

Enables automatic form-filling for known and unknown fields. Known field values can be customized in the form config file (default location: `$HOME/.config/katana/form-config.yaml`)

cli

Copy

```bash
1katana -u https://tesla.com -aff
```

## Handling your output

### Field

The field flag is used to filter the output for the desired information you are searching for. ProjectDiscovery has been kind enough to give a very detailed table of all the fields with examples:

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh6.googleusercontent.com%2FeCwhYeZVN82ylX_ZIiJwFhPufELD95stK0wW2FrjhRXx_r9_Huj31-9zbSbsABZ05qMXf4R7rK3hCJpQ7y0v38Q0ADjQB5vh9Bmf_LqlSK-jqBFkRfpGp306oL2gfSZv7iVfyQI_OYrrA1CvP5bfdPgflIpdPB8u8PHvTRuXENomTuO2sq30UTW0ZS7L_g&w=3840&q=75)

Look what happens when filtering the output of the crawl to only return URLs with query parameters in it:

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh4.googleusercontent.com%2F5t4xSf58FV9Grf5DWHzI-GJDjPGpOjhtA8WC8IuH97uEcTyAoe9sYjRqhn0Us2h-pwBKIAchQIUqY5dbEjM3afRz5dUKfeXUydj4mvnTMs_WljJ-TqksK464mXf8J-Ey5NDFYbnCGpYp__MN1GV9lsEAiAIa8bJaXsHFbTrqRRvIpHIO__zmP-TD1a8G-Q&w=3840&q=75)

### Store-field

The store-field flag does the same thing as the field flag we just went over, except that it filters the output that is being stored in the file of your choice. It is awesome that they are split up. Between the store-field flag and the field flag above, you can make the data you see and the data you store different if needed.

cli

Copy

```bash
1katana -u https://tesla.com -sf key,fqdn,qurl
```

### Extension-match & extension-filter

You can use the extension-match flag to only return urls that end with your chosen extensions

cli

Copy

```bash
1katana -u https://tesla.com -silent -em js,jsp,json
```

If you would rather filter for file extensions you DON’T want in the output, then you can filter them out of the output using the extension-filter flag

cli

Copy

```bash
1katana -u https://tesla.com -silent -ef css,txt,md
```

### JSON

Katana has a JSON flag that allows you to output a JSON format that includes the source, tag, and attribute name related to the discovered endpoint.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Flh6.googleusercontent.com%2FsN0mOe7A-a48yRAXRI8XwgB5HpW8i9kOhnkBPsTkNZzU6zs2tTEbu3SQcfmTmyMl2ivhbbfUnbqJkjdIw6iz7fbWNFkAkrGwV2SlsPlMOIi1d4a5V7oJ9y9KnlfGkWCB-QGmughPDZLvSxfhN826hmjBgMrZjE94jjUnQnF25zvr_g0vEVPJ8Jo5HE5P3w&w=3840&q=75)

## Rate limiting and delays

### Delay

The delay flag allows you to set a delay (in seconds) between requests while crawling. This feature is turned off by default.

cli

Copy

```bash
1katana -u https://tesla.com -delay 20
```

### Concurrency

The concurrency flag is used to set the number of URLs per target to fetch at a time. Notice that this flag is used along with the parallelism flag to create the total concurrency model.

cli

Copy

```bash
1katana -u https://tesla.com -c 20
```

### Parallelism

The parallelism flag is used to set the number of targets to be processed at one time. If you only have one target, then there is no need to set this flag.

cli

Copy

```bash
1katana -u https://tesla.com -p 20
```

### Rate-limit

This flag allows you to set the maximum number of requests that the crawler is sending out per second

cli

Copy

```bash
1katana -u https://tesla.com -rl 100
```

### Rate-limit-minute

A rate-limiting flag similar to the one above, but used to set a maximum number of requests per minute.

cli

Copy

```bash
1katana -u https://tesla.com -rlm 500
```

## Chaining Katana with other ProjectDiscovery tools

Since katana can take input from STDIN, it is straightforward to chain katana with the other tools that ProjectDiscovery has released. A good example of this is:

cli

Copy

```bash
1subfinder -d tesla.com -silent | httpx -silent | katana
```

## Conclusion

Hopefully, this has excited you to go out and crawl the planet. With all the options available, you should have no problem fitting this tool into your workflows. ProjectDiscovery has made this wonderful web crawler to cover many sore spots created by crawlers of the past. Katana makes crawling look like running!

Author – [**Gunnar Andrews**](https://www.linkedin.com/in/gunnar-andrews-317995136/) [,](https://www.linkedin.com/in/gunnar-andrews-317995136/) [@g0lden1](https://www.youtube.com/@g0lden1?)

## Related stories

Related stories

[View all](https://projectdiscovery.io/blog/category/attack-surface-management/1)

[PD](https://projectdiscovery.io/blog/surfacing-the-real-attack-surface-advances-in-asset-discovery)

[**Surfacing the real attack surface: Advances in asset discovery** \\
Introduction\\
\\
Accurate external asset discovery remains a moving target for security teams at scale. What’s actually exposed is hard to pin down, regardless of how many inventories or spreadsheets an organization maintains. Release cycles move faster, new domains and endpoints are added constantly, and the attack surface continues to shift, leaving static processes and visibility tools struggling to keep up.\\
\\
Traditional discovery tools are effective at identifying well-known or easily indexed a](https://projectdiscovery.io/blog/surfacing-the-real-attack-surface-advances-in-asset-discovery)

[PD](https://projectdiscovery.io/blog/leaked-credential-monitoring)

[**Introducing Credential Monitoring** \\
Imagine discovering that your company's login credentials are sitting in plain sight on the internet, accessible to anyone who knows where to look. Unfortunately, this isn't hypothetical – it's happening right now to organizations worldwide through malware-stolen credentials.\\
\\
The Hidden Threat: Malware-Stolen Credentials\\
\\
Every day, cybercriminals deploy malicious software that quietly steals passwords from infected computers. These "stealer" programs harvest credentials from browsers and appl](https://projectdiscovery.io/blog/leaked-credential-monitoring)

[PD](https://projectdiscovery.io/blog/resilient-cyber-podcast-modernizing-vulnerability-management-with-open-source)

[**Resilient Cyber podcast: Modernizing vulnerability management with open source** \\
We offer a modern open source powered solution that accurately detects exploitable vulnerabilities and automates the core parts of vulnerability management. And that all starts with Nuclei.](https://projectdiscovery.io/blog/resilient-cyber-podcast-modernizing-vulnerability-management-with-open-source)

## Footer

See Neo run complex security tasks.

### Book a demo.

[Request a Demo](https://projectdiscovery.io/request-demo)

![ProjectDiscovery Logo](https://projectdiscovery.io/_next/static/media/ProjectDiscoveryLogo.a524f50f.svg)

![SOC2 Compliant Logo](https://projectdiscovery.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FSOC2_logo_new.0c2775e9.png&w=256&q=75)![RSA](https://projectdiscovery.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FRSAC-Innovation-Sandbox-Winner-2025.7413d9c1.png&w=128&q=75)![Blackhat](https://projectdiscovery.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FBlackhat-2025-winner.1c13cfde.png&w=256&q=75)[![G2](https://projectdiscovery.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FG2-Logo.4b08973a.png&w=128&q=75)](https://www.g2.com/products/projectdiscovery/reviews)

### Open Source

- [Nuclei](https://projectdiscovery.io/nuclei)
- [Nuclei Templates](https://cloud.projectdiscovery.io/templates)
- [Subfinder](https://github.com/projectdiscovery/subfinder)
- [HTTPx](https://github.com/projectdiscovery/httpx)
- [Naabu](https://github.com/projectdiscovery/naabu)
- [CVEmap](https://github.com/projectdiscovery/cvemap)
- [All tools](https://projectdiscovery.io/open-source)

### Resources

- [Blog](https://projectdiscovery.io/blog)
- [Neo for MSSPs](https://projectdiscovery.io/use-cases/neo-for-mssps)

### Company

- [Security](https://security.projectdiscovery.io/)
- [Privacy](https://projectdiscovery.io/privacy)
- [Terms](https://projectdiscovery.io/terms)
- [Contact](https://projectdiscovery.io/contact)

[Discord](https://discord.com/invite/projectdiscovery) [GitHub](https://github.com/projectdiscovery) [X](https://twitter.com/pdiscoveryio) [LinkedIn](https://www.linkedin.com/company/projectdiscovery) [YouTube](https://www.youtube.com/@projectdiscovery)

©2026 ProjectDiscovery, Inc.