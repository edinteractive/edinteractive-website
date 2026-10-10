# edinteractivegroup.com

> Live on **edinteractive.digital** first. Canonicals, og tags, `sitemap.xml` and `robots.txt` use edinteractive.digital until the edinteractivegroup.com cutover; at cutover, find-and-replace the domain in those files (and the `sameAs` in the homepage JSON-LD), plus add a 301 from edinteractive.digital.

Static site for ED Interactive Group, hosted on Cloudflare Pages.

- No build step. Cloudflare Pages: build command empty, output directory `/`.
- `_headers` security and cache headers, `_redirects` old-URL redirects.
- Every pull request runs `.github/workflows/checks.yml` (HTML validation, link check, Lighthouse minimums) and gets a Cloudflare preview URL.
- Brand tokens come from the project's `brand/tokens/brand-tokens.css` (v0.2 Signal Gold).

Full hosting and DNS plan: see `hosting-plan.md` in the project's website folder.
