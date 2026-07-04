# Security Policy

This repository is source-available for portfolio and engineering review (see
[LICENSE.md](LICENSE.md)). It is not a supported product, but I take security
reports seriously — especially anything affecting the live site or its data
plane.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report privately via one of:

- **GitHub Security Advisories** — the preferred channel: open a private report
  under the repository's **Security → Report a vulnerability** tab
  ([Private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)).
- **Email** — `lamounierleao@gmail.com` with `SECURITY` in the subject line.

Please include enough detail to reproduce: affected URL or file, the impact, and
a proof-of-concept or steps where possible.

## What to expect

- Acknowledgement of your report within **72 hours**.
- An initial assessment and severity triage within **7 days**.
- Coordinated disclosure — I'll keep you updated on the fix and credit you if
  you'd like once any live-affecting issue is resolved.

## Scope

Most sensitive concerns live outside this repository by design. The site is a
consumer-only application that holds **no AWS data credentials at runtime** —
articles, chat, resume, and engagement are read through the in-cluster
`public-api` BFF, and the Bedrock API key is owned by that BFF (AWS Secrets
Manager), never the browser or this app. See
[chatbot data security](docs/concepts/chatbot-data-security.md) and
[in-cluster BFF consumer architecture](docs/concepts/in-cluster-bff-consumer.md)
for the trust boundary.

Especially relevant reports for **this** repo include: exposure of a secret or
credential in the source or build, an authentication/authorisation bypass in a
route handler (e.g. `/api/metrics`, admin routes), server-side request forgery,
or a cross-site scripting vector in rendered MDX content.
