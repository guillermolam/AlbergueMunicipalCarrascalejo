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

Apr 27, 2023\-

5 min read

# A Deep Dive on Katana "Field" Extraction

[Learning & Automation](https://projectdiscovery.io/blog/category/learning-automation/1)

![A Deep Dive on Katana "Field" Extraction](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2024%2F01%2FBlog--Katana-1.png&w=828&q=75)

#### Table of Contents

- [Introduction to Katana](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#introduction-to-katana "Introduction to Katana")
- [What is Field Extraction?](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#what-is-field-extraction "What is Field Extraction?")
- [Custom field extraction using Katana](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#custom-field-extraction-using-katana "Custom field extraction using Katana")
- [Default field extraction using Katana](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#default-field-extraction-using-katana "Default field extraction using Katana")
- [User defined custom field extraction using Katana](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#user-defined-custom-field-extraction-using-katana "User defined custom field extraction using Katana")
- [Conclusion](https://projectdiscovery.io/blog/a-deep-dive-on-katana-field-extraction#conclusion "Conclusion")

#### Authors

[![ProjectDiscovery](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2025%2F04%2FProjectDiscovery_Primary_Logo_Mark_onDark-2.png&w=96&q=75)\\
\\
**ProjectDiscovery**](https://projectdiscovery.io/blog/author/projectdiscovery/1)

#### Share

Reconnaissance is an important step in identifying and building your organization's attack surface or targeted assets. Web crawling is a prominent reconnaissance technique that allows you to gather information by automatically traversing and extracting data from web pages. However, this process often results in unstructured data that contains countless URLs and parameters, making it difficult to identify unique endpoints, parameters, and fields for use in automation or reconnaissance pipelines. There should be an easier way.

We’d like to introduce [Katana](https://github.com/projectdiscovery/katana) – a Golang-based CLI tool developed by [ProjectDiscovery](https://projectdiscovery.io/) that employs headless browsing to efficiently crawly and spider web applications while simultaneously supporting field extraction. With Katana's field extraction capabilities, you can easily filter and utilize your output as input for other tools or incorporate it into your reconnaissance pipeline.

In this blog, we'll discuss the intricacies of using Katana for web crawling, performing field extraction, and using the tool's output to enhance your reconnaissance pipeline.

## Introduction to Katana

Katana is an open-source tool that supports standard and headless modes, allowing for JavaScript parsing and crawling. Katana also has customizable automatic form filling, preconfigured field and regex-based scope control, and configurable output options, including predefined fields and support for multiple input sources such as STDIN, URL, and LIST.

With Katana, you can perform field extraction and use the output to build your recon automation pipeline using the ProjectDiscovery tools suite and other widely used recon tools. You can directly install Katana using Binary or Docker. More information can be found at: [https://github.com/projectdiscovery/katana](https://github.com/projectdiscovery/katana)

Once you have installed Katana, run the following command to verify the installation:

**Command:**`katana --version`

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-40ee60a6-bf22-4a0e-aa65-0567623a2ecc.png&w=3840&q=75)

## What is Field Extraction?

Field extraction is a process that allows the extraction of specific data fields from unstructured data to make it more useful for further processing and utilization. It helps to reduce the amount of data that needs to be processed by focusing on specific fields of interest. This can be especially helpful in security-related tasks such as reconnaissance, where identifying key pieces of data, such as endpoints or credentials, can be critical for identifying and mitigating potential threats.

For example, let’s assume you want to perform automated fuzzing for Cross-Site Scripting (XSS) vulnerabilities. In this case, you can attempt to extract the various unique parameters from the output and fuzz the uniquely identified endpoints with these parameters containing XSS payloads to check for potential reflection. The below flow diagram explains this use case:

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-0c827eb8-c6ce-448b-9a66-26ada9d29cff.png&w=3840&q=75)

Using regex rules, Katana allows the custom fields to extract and store specific information from page responses. These custom fields are defined using a YAML config file and are loaded from the default location at $HOME/.config/katana/field-config.yaml. Alternatively, you can use the `-flc` option to load a custom field config file from a different location.

## Custom field extraction using Katana

### Default field extraction using Katana

Katana supports multiple default fields such as `url`, `path`, `fqdn`, `rdn`, `rurl`, `qurl`, `qpath`, `file`, `key`, `value`, `kv`, `dir`, `udir` which can directly be extracted without requiring to use a custom regex. You can check the table provided at [https://github.com/projectdiscovery/katana#-field](https://github.com/projectdiscovery/katana) to understand what each field identifier does.

Let’s see this in action using following steps:

1. First, run the tool with no additional feature flags to see how the data is returned.

**Command:**`katana -u https://yahoo.com`

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-f88dfb21-9735-4f61-9dff-4cebc7ce5cf3.png&w=3840&q=75)

2\. This screenshot of the data at the end of the run shows how many endpoints have been returned. The tool has returned data containing approximately 205 endpoints that may have duplicity or otherwise contain data that is not of interest.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-73a20e97-61bf-42dd-a4f7-313c81cdd60d.png&w=3840&q=75)

3\. Now, run the tool using default field extraction trying to extract the `qurl` field. This extracts the URL including query parameters.

**Command:**`katana -u https://yahoo.com -f qurl`

4\. Now, the output only contains endpoints having a query parameter and the output has been reduced from 205 endpoints to 25.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-c2ff62f2-7b15-47c5-8c39-1e988ae3251d.png&w=3840&q=75)

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-69c68f4a-a4a8-442d-a5f1-98193ee72eec.png&w=3840&q=75)

### User defined custom field extraction using Katana

Katana also supports custom field extraction with user defined regex.

1. First, run the tool with no additional feature flags to see how the data is returned.

**Command:**`katana -u` [`https://tesla.com`](https://tesla.com/)

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-2f0c0cfd-80a0-4b41-8853-d7bb56640412.png&w=3840&q=75)

2\. This command returned data containing approximately 1033 endpoints that may have duplicity or contain data that is not of interest.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-3b954518-7494-4f3e-b0b5-fa694a1db896.png&w=3840&q=75)

3\. Now, run the tool using field extraction to extract the `email` field using the below command:

**Command:**`katana -u` [`https://tesla.com`](https://tesla.com/)` -f email`

4\. Now, the output only contains potentially extracted email addresses.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-1a581d2d-ea11-44d5-a08e-43c7b35bccb6.png&w=3840&q=75)

Alternatively, you can use the `-flc` option to load a custom field configuration file from a different location using the following steps:

1. Create a regex file as mentioned in the following documentation: [https://github.com/projectdiscovery/katana#custom-fields](https://github.com/projectdiscovery/katana)

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-94e162bb-3e3d-4786-b99b-f2d287d685fe.png&w=3840&q=75)

2\. Run the following command to load the configuration file from a user-defined location:

**Command:**`katana -u` [`https://tesla.com`](https://tesla.com/)` -flc custom.yaml -f test`

3\. The desired output, "email”, based on the regex, is returned.

![](https://projectdiscovery.io/_next/image?url=https%3A%2F%2Fprojectdiscovery.ghost.io%2Fcontent%2Fimages%2F2023%2F04%2Fdata-src-image-5376d192-5498-4eb7-96c7-995166edbd3b.png&w=3840&q=75)

**Note:** In the above command, you need to supply the config file value (.yaml) in the `-flc` parameter and the “name” used in the config file in the `-f` parameter to get the desired output.

## Conclusion

Katana is a powerful tool that can make web crawling easier, more efficient, and more customizable. Its advanced field extraction capabilities allow users to fine-tune the output to match their specific needs for further processing. Whether you're a security researcher, a data analyst, or just someone looking to extract information from the web, you'll likely have some good use-cases for Katana.

Give it a [try](https://github.com/projectdiscovery/katana)!

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