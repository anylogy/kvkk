---
name: kvkk-dsar-breach-ops
description: >-
  Guides Turkish KVKK Article 11 data subject request (DSAR / Ilgili Kisi
  Basvurusu) operations under the Application Communique (mandatory fields,
  identity verification minimization, 30-day SLA), 72-hour Data Breach Response
  Playbook under Board Decisions 2019/10 and 2019/271, and deterministic
  SHA-256 legal document hash verification.
license: Apache-2.0
metadata:
  author: anylogy
  version: "2.0.0"
  domain: privacy
  subdomain: dsar-and-breach-ops
  tags: "kvkk, article-11, dsar, breach-72h, decision-2019-10, decision-2019-271, sha256"
---

# KVKK DSAR (Article 11) & 72-Hour Breach Operations

> **Compliance Engineering Notice:** This skill and its verification script are technical compliance engineering tools.
> They do not constitute formal Turkish legal advice (*hukuki mutalaa*) and must be reviewed with qualified Turkish legal counsel before regulatory breach filings or formal DSAR rejections.

## Purpose and Scope

Use this skill to implement Article 11 *Ilgili Kisi* application intake/response workflows, run the 72-hour KVKK Board and data-subject breach notification playbook, and cryptographically pin published legal notices against tamper or unfilled placeholders.

Load supporting artifacts on demand:
- Statutory DSAR & breach SLAs, Decision 2019/10 and 2019/271 checklists: `references/dsar-and-breach-slas.md`
- Application Communique-compliant Turkish DSAR form: `assets/ilgili-kisi-basvuru-formu.md`
- 72-hour Board & Data Subject breach notice templates: `assets/breach-notification-template.md`
- Deterministic SHA-256 legal document & placeholder verifier: `scripts/verify-legal-hashes.mjs`

## Step 1: Verify Legal Document Hashes & Placeholders

Run `scripts/verify-legal-hashes.mjs` (resolved relative to this skill's directory when auditing external repositories) in CI or before deploying legal text updates to verify canonical UTF-8 (`LF`-normalized, or `--raw-bytes`) SHA-256 manifest integrity and detect unfilled `[PLACEHOLDER_...]` tokens:

```bash
node skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs \
  --dir /path/to/legal-docs \
  --manifest /path/to/legal-docs/manifest.json \
  --json
```

To generate a fresh SHA-256 manifest after filling all placeholders:

```bash
node skills/kvkk-dsar-breach-ops/scripts/verify-legal-hashes.mjs \
  --dir /path/to/legal-docs \
  --generate \
  --json
```

## Step 2: Operate Article 11 DSAR Intake (30-Day SLA)

Follow the *Veri Sorumlusuna Basvuru Usul ve Esaslari Hakkinda Teblig*:
1. **Mandatory Intake Fields:** Collect only full name, signature (if written), TCKN (or nationality + passport/foreign ID number for non-citizens), residential/business address for notification, optional email/phone/fax, and the clear request subject (see `assets/ilgili-kisi-basvuru-formu.md`).
2. **Identity Verification Without Over-Collection:** Verify identity using existing account factors or proportionate confirmation; never demand raw ID card photocopies unless strictly required and immediately purged after verification.
3. **30-Day Strict SLA, Response Elements & Art. 14 Window:** Conclude in writing or electronically within **30 calendar days** at zero charge (up to 1 TL/page beyond 10 pages or media cost), including all Application Communique Art. 6/3 elements (controller identity, applicant details, subject, reasoned explanations), and note the **Art. 14 Board complaint window** (30 days from response, max 60 days from application).
4. **Statutory Retention Carve-Outs:** If a user requests erasure under Article 7/11, retain records required by Law No. 5651, VUK, or TTK while blocking active operational processing and logging the decision.

## Step 3: Execute 72-Hour Data Breach Playbook

Under Article 12/5 and Board Decisions **2019/10 (24.01.2019)** and **2019/271 (18.09.2019)**:
1. **Hour 0-12 (Containment, Forensics & Processor Escalation):** Isolate compromised credentials/hosts, preserve WORM forensic logs, require any *Veri Isleyen* detecting an incident to notify the *Veri Sorumlusu* **immediately without delay**, and check whether Article 6 special category data was exposed.
2. **Hour 12-72 (Board Notification - Decision 2019/10):** Submit the *Kisisel Veri Ihlali Bildirim Formu* to the KVKK Board within **72 hours** of awareness (if complete forensic details are unavailable, submit an initial 72-hour notice followed by phased updates).
3. **As Soon As Reasonably Possible After Identification (Data Subject Notice - Decision 2019/271):** Once affected *Ilgili Kisi* individuals are identified, notify them *makul olan en kisa surede* directly (or via clear website publication if direct contact is impossible) containing all 5 mandatory elements in `assets/breach-notification-template.md`.
4. **Post-Incident Hardening:** Record remediation, rotate KMS/API keys, update the *Kisisel Veri Isleme Envanteri*, and retain incident evidence.
