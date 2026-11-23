# First-Party Zero-Leak Content-Security-Policy (CSP) Blueprint

> **Notice:** Technical browser security blueprint to prevent accidental Article 9 third-party telemetry, font, script, and beacon transfers.
> Not formal Turkish legal advice (*hukuki mutalaa*).

## Principle

Every external `script-src`, `style-src`, `font-src`, `img-src`, or `connect-src` origin contacted by the browser transmits at least the visitor's IP address, user-agent, and request headers outside Turkiye.
Enforce a strict `'self'` CSP at the reverse proxy so unapproved third-party SDKs or CDN embeds fail closed before any Art. 9 leak occurs.

## 1. Caddyfile Header Snippet

```caddy
header {
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Content-Type-Options "nosniff"
    Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()"
}
```

## 2. Nginx Header Snippet

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()" always;
```

## 3. HTML Meta Fallback (When Proxy Header Injection Is Unavailable)

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'"
/>
```

## Verification Notes

1. Self-host all fonts (`.woff2`) and scripts locally in `/assets/` before enabling this header.
2. If an audited vendor with a filed KVKK Article 9 Standard Contract (SS-2) requires browser connectivity, add only that exact origin to the corresponding directive and document its `kvkk_notification_date` in `subprocessors.json`.
