---
name: kvkk-frontend-audit
description: >-
  Audits and remediates web frontends (Svelte, React, Next.js, Vue, Astro, HTML)
  for Turkish KVKK compliance: Article 9 browser-side foreign leaks (CDNs,
  Google Fonts, GA4, third-party captchas/OAuth), KVKK Cookie Guidelines equal-
  prominence buttons, layered Aydinlatma vs. Acik Riza separation, incidental
  Article 6 ID/passport upload handling, Law No. 6563 (ETK/IYS) decoupling, and
  strict first-party CSP enforcement.
license: Apache-2.0
metadata:
  author: anylogy
  version: "2.0.0"
  domain: privacy
  subdomain: frontend-privacy-engineering
  tags: "kvkk, frontend-audit, cookies, aydinlatma, csp, article-9, etk-iys"
---

# KVKK Frontend Privacy Audit & Remediation

> **Compliance Engineering Notice:** This skill and its scanner are technical compliance engineering tools.
> They do not constitute formal Turkish legal advice (*hukuki mutalaa*) and must be reviewed with qualified Turkish legal counsel before production legal sign-off.

## Purpose and Scope

Browser clients frequently trigger silent Article 9 cross-border transfers and Cookie Guidelines violations before backend code ever executes.
Use this skill to scan frontend repositories, eliminate foreign third-party leaks, separate *Aydinlatma Metni* from *Acik Riza* and ETK/IYS marketing checkboxes, and ship first-party CSP headers.

Load supporting artifacts on demand:
- Cookie Guidelines, dark-pattern bans, and multilingual localization rules: `references/cookie-and-ux-rules.md`
- Strict Category-to-Sub-clause layered Turkish *Aydinlatma Metni* blueprint: `assets/aydinlatma-layered-template.md`
- Zero-leak first-party Content-Security-Policy blueprint: `assets/csp-zero-leak-template.md`
- Recursive zero-dependency frontend leak scanner: `scripts/scan-frontend-leaks.mjs`

## Step 1: Run Automated Frontend Leak Scan

Run `scripts/scan-frontend-leaks.mjs` (resolved relative to this skill's directory when auditing external repositories) against the target frontend repository:

```bash
node skills/kvkk-frontend-audit/scripts/scan-frontend-leaks.mjs \
  --target /path/to/frontend \
  --allow-domain app.example.com.tr \
  --strict-placeholders \
  --json
```

Inspect every finding by severity:
- **P0 (`ART9_FOREIGN_ENDPOINT`, `ART9_FOREIGN_SDK_DEP`):** Unverified foreign CDNs, Google Fonts, GA4/GTM, Meta Pixel, Sentry/Hotjar, Stripe/reCAPTCHA/Turnstile embeds, or telemetry SDKs transmitting IP addresses and browser fingerprints outside Turkiye without valid post-Sept 2024 Article 9 safeguards (third-party endpoints backed by an executed & KVKK-notified Standard Contract and updated *Aydinlatma Metni* can be flagged for verification via `--art9-approved-domain`).
- **P0 (`CLIENT_STORAGE_PII`):** Writes or reads in `document.cookie`, `localStorage`, or `sessionStorage` involving TCKN, passport numbers, emails, phone numbers, dates of birth, or health fields.
- **P1 (`PRECHECKED_CONSENT`):** Pre-checked `checked={true}`, `defaultChecked`, or HTML `checked` inputs violating opt-in consent rules.
- **P1 (`CONSOLE_PII_LEAK`):** Client-side `console.log`/`info`/`warn` statements exposing personal data.
- **P1 (`UNFILLED_PLACEHOLDER`):** Unreplaced `[PLACEHOLDER_VERI_SORUMLUSU_...]` tokens when `--strict-placeholders` is enabled.

## Step 2: Eliminate Browser-Side Article 9 Leaks

1. Self-host all web fonts, icons, CSS, and JavaScript bundles under your own Turkish-hosted origin (`self` / `/assets/...`).
2. Remove unverified third-party analytics, session replay, and foreign captcha widgets unless a valid post-Sept 2024 Article 9 transfer mechanism (e.g., Standard Contract SS-2 notified to KVKK within 5 business days + updated *Aydinlatma Metni*) covers the vendor and the domain is explicitly tracked via `--art9-approved-domain`.
3. Enforce `assets/csp-zero-leak-template.md` in Caddy, Nginx, or reverse-proxy headers so `default-src 'self'`, `connect-src 'self'`, and `font-src 'self'` block accidental future regressions at the browser boundary.

## Step 3: Enforce Cookie Guidelines & Consent UX

Verify against `references/cookie-and-ux-rules.md`:
1. Block all non-essential cookies (analytics, personalization, advertising) until explicit opt-in consent is recorded.
2. Render "Accept All" (*Tumunu Kabul Et*) and "Reject All" (*Tumunu Reddet*) on Layer 1 with identical size, contrast, color weight, and click depth.
3. Ban cookie walls, pre-ticked checkboxes, and bundled "by continuing you agree" dark patterns.
4. Expose an easy, persistent "Cookie Preferences" (*Cerez Tercihleri*) trigger in the footer.
5. Audit persistent `<footer>` legal links (*Aydinlatma Metni*, *Cerez Tercihleri* or Zero-Cookie Policy, and *Veri Sorumlusu* disclosure) and zero-egress footer assets against Section 4 of `references/cookie-and-ux-rules.md`.

## Step 4: Separate Aydinlatma, Acik Riza, and ETK / IYS

1. Keep the *Aydinlatma Metni* (Article 10 disclosure, read-only) completely separate from any *Acik Riza* (Article 5/1 or 6/3-a opt-in checkbox).
2. Structure the notice using `assets/aydinlatma-layered-template.md` (Category -> Concrete Data -> Purpose -> Exact Art. 5/2 or 6/3 Sub-clause -> Retention -> Recipient).
3. Decouple Law No. 6563 (ETK) / IYS commercial SMS, email, and voice marketing consents into independent, unchecked controls.
4. For multilingual apps, ensure the Turkish *Aydinlatma Metni* matches the active UI language without distorting statutory legal bases.

## Step 5: Protect Incidental Article 6 Document Uploads

When users upload national IDs, passports, or residence permits:
1. Remember that nationality (*uyruk*) alone is Article 5 general data, while document images routinely reveal **incidental Article 6 data** (religion, blood type, biometric facial templates).
2. Warn users clearly in the upload UI to redact unnecessary fields where permitted, upload over TLS directly to Turkish-hosted encrypted object storage, and never cache upload previews or extracted fields in `localStorage` or `sessionStorage`.
