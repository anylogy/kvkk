# KVKK Cookie Guidelines & Frontend UX Rules

> **Notice:** Technical engineering checklist derived from KVKK Board Cookie Guidelines (*Cerez Uygulamalari Rehberi*), the Clarification Communique, and Law No. 6563 (ETK).
> Not formal Turkish legal advice (*hukuki mutalaa*).

## 1. KVKK Cookie Guidelines (*Cerez Uygulamalari Rehberi*)

1. **Prior Opt-In for Non-Essential Cookies:** Strictly necessary cookies (session state, CSRF token, load-balancing, user-requested security preference) may operate under Article 5/2-c or 5/2-f without explicit consent.
All analytics, performance, functional-extra, and advertising cookies MUST remain blocked until the *Ilgili Kisi* grants active *Acik Riza*.
2. **Equal Visual Prominence on Layer 1:** The initial banner MUST display "Accept All" (*Tumunu Kabul Et*), "Reject All" (*Tumunu Reddet*), and "Preferences" (*Tercihleri Yonet*) with equal font weight, button dimensions, visual contrast, and click depth.
3. **Zero Dark Patterns:**
   - Never highlight "Accept All" in bright primary color while hiding "Reject All" as small muted underlined text.
   - Never pre-check non-essential toggles (`checked={true}` or `defaultChecked`).
   - Never condition core service access on consenting to non-essential marketing or analytics cookies (*hizmetin acik riza sartina baglanmasi yasagi*) or deploy cookie walls that force unlawful bundled consent.
   - Never treat scrolling, closing via `X`, or continued browsing as implied consent.
4. **Granular Toggle & Withdrawal:** Users must be able to toggle each cookie category independently and withdraw consent at any time via a persistent footer link with the same ease as granting it.

## 2. Aydinlatma vs. Acik Riza & ETK/IYS Separation

Under the Clarification Communique (*Aydinlatma Yukumlulugunun Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkinda Teblig*):
- *Aydinlatma* is a mandatory unilateral statutory obligation (Art. 10), NOT a consent prompt.
- *Acik Riza* MUST NEVER be bundled inside Terms of Service (*Kullanim Kosullari*) or inside the *Aydinlatma Metni* acceptance checkbox.
- **ETK / IYS Decoupling (Law No. 6563):** Commercial electronic communications (SMS, email, voice calls) require separate opt-in logged to *Ileti Yonetim Sistemi* (IYS).
Do not merge KVKK *Acik Riza* with ETK marketing opt-in in a single checkbox.

## 3. Multilingual App Localization Rules

- Applications serving foreign residents or multilingual audiences in Turkiye must render the *Aydinlatma Metni* in Turkish as the authoritative baseline and provide accurate translations in the active user UI language.
- Never machine-translate statutory sub-clauses into non-equivalent GDPR concepts (for example, never translate *Acik Riza* as GDPR Art. 6(1)(a) or *Irtibat Kisisi* as DPO).
- Always record the exact language, version, and SHA-256 hash of the notice displayed to the user at the time of submission or consent.

## 4. Persistent Footer Legal & Privacy Touchpoints

Global `<footer>` landmarks enforce persistent statutory transparency, consent withdrawal, and Article 9 zero-egress boundaries on every route:

1. **Art. 10 *Aydinlatma Metni* Persistence:**
   - Expose a permanent, one-click, read-only *Aydinlatma Metni* link inside `<footer>` across all pages.
   - Never bury this disclosure solely inside Terms of Service (*Kullanim Kosullari*) or bundle it behind an *Acik Riza* checkbox.
2. **Cookie Guidelines Withdrawal Parity:**
   - Whenever non-essential cookies exist, expose a persistent *Cerez Tercihleri* (Cookie Preferences) trigger in `<footer>` that enables consent withdrawal with the same ease as granting it.
   - For zero-cookie static sites that set no non-essential cookies, link directly to the read-only Zero-Cookie Policy instead of rendering an unnecessary consent banner.
3. **Art. 9 Zero-Egress Footer Assets:**
   - Never embed unverified foreign trust-seal scripts, third-party social widgets, external icon CDNs, or externally hosted badge images inside `<footer>` (enforced by `scripts/scan-frontend-leaks.mjs`).
   - Serve footer icons and badges as self-hosted assets or inline SVGs under your Turkish-hosted origin.
   - Add `rel="noopener noreferrer"` on external links to prevent referrer leakage to third-party origins.
4. **Data Controller Transparency & Statutory Boundaries:**
   - Surface verifiable *Veri Sorumlusu* identification (legal title / trade name, MERSIS, trade registry or tax ID, KEP, or a direct link to the controller disclosure section).
   - Keep controller identification clearly separated from non-affiliation disclaimers and Law No. 6563 (ETK) commercial communication boundaries.
