# explorerstu.com

Static books site for Explorer Stu / Stu’s 7 Wonders, meant to be served from GitHub Pages at https://explorerstu.com.

This folder is the updated site (China “Get the book” button added, canonical URLs pointed at explorerstu.com, CNAME file included). It is ready to push.

## Remaining GitHub steps (the Cursor GitHub connector cannot do these)

1. Push these files to `clawnick1295/stus-7-wonders` on the `main` branch (repo root). That repo already has GitHub Pages enabled and currently serves https://clawnick1295.github.io/stus-7-wonders/. A new repo is not required.
2. In the repo’s Pages settings, set the custom domain to `explorerstu.com` and wait for the TLS certificate.
3. Then enable “Enforce HTTPS”.

Cloudflare DNS is already in place (DNS only, not proxied):

- `explorerstu.com` A → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- `www` CNAME → `clawnick1295.github.io`

Until the custom domain is set on the repo, GitHub answers HTTP 404 and HTTPS presents the `*.github.io` certificate.
