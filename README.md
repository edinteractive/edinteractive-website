# edinteractivegroup.com

> Live on **edinteractive.digital** first. Canonicals, og tags, `sitemap.xml` and `robots.txt` use edinteractive.digital until the edinteractivegroup.com cutover; at cutover, find-and-replace the domain in those files (and the `sameAs` in the homepage JSON-LD), plus add a 301 from edinteractive.digital.

Static site for ED Interactive Group, hosted on Cloudflare Pages.

- No build step. Cloudflare Pages: build command empty, output directory `/`.
- `_headers` security and cache headers, `_redirects` old-URL redirects.
- Every pull request runs `.github/workflows/checks.yml` (HTML validation, link check, Lighthouse minimums) and gets a Cloudflare preview URL.
- Brand tokens come from the project's `brand/tokens/brand-tokens.css` (v0.2 Signal Gold).

Full hosting and DNS plan: see `hosting-plan.md` in the project's website folder.

## Health check: settings in Cloudflare Pages

Settings > Variables and secrets (Production and Preview):

- `TURNSTILE_SECRET` (secret): the Turnstile widget's secret key. Its site key goes in the `turnstile-sitekey` meta tag in `health-check/index.html`. Create the widget in Cloudflare > Turnstile (Managed mode), with hostnames `edinteractive.digital`, `edinteractivegroup.com` and the project's `pages.dev` host. Until both are set, the report is not emailed to the visitor, only to `NOTIFY_TO`, so the form can't be used to send mail to strangers.
- `SMTP_USER`, `SMTP_PASS` and optionally `SMTP_HOST` and `NOTIFY_TO`: see the top of `functions/api/health-check.js`.
