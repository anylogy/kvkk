---
name: kvkk-cross-border-art9
description: >-
  Evaluates and audits Turkish KVKK Article 9 cross-border personal data
  transfers under the post-September 1, 2024 regime (Law No. 7499): 3-tier
  transfer hierarchy, Standard Contracts (SS-1 to SS-4), 5-business-day KVKK
  Authority notification tracking (Art. 18/1-d fine exposure on both
  controllers and processors), sovereign Turkish infrastructure checks, and
  subprocessor register auditing.
license: Apache-2.0
metadata:
  author: anylogy
  version: "2.0.0"
  domain: privacy
  subdomain: cross-border-transfers
  tags: "kvkk, article-9, standard-contracts, ss-1, ss-2, ss-3, ss-4, subprocessors, sovereign-infra"
---

# KVKK Cross-Border Transfers (Post-Sept 1, 2024 Article 9)

> **Compliance Engineering Notice:** This skill and its auditor script are technical compliance engineering tools.
> They do not constitute formal Turkish legal advice (*hukuki mutalaa*) and must be reviewed with qualified Turkish legal counsel before executing or filing Standard Contracts.

## Purpose and Scope

Under Law No. 7499 (effective September 1, 2024), explicit consent is **illegal** for continuous or systematic transfers of personal data outside Turkiye.
Use this skill to evaluate vendor/subprocessor chains, select the proper Article 9 tier, track the mandatory 5-business-day KVKK Authority filing deadline, and audit sovereign Turkish hosting configurations.

Load supporting artifacts on demand:
- Full 3-tier statutory decision tree and SS-1 to SS-4 matrix: `references/art9-decision-tree.md`
- Machine-readable subprocessor manifest blueprint: `assets/subprocessor-register-template.json`
- Subprocessor & 5-business-day SCC deadline auditor: `scripts/audit-subprocessors.mjs`

## Step 1: Audit the Subprocessor Register

Run `scripts/audit-subprocessors.mjs` (resolved relative to this skill's directory when auditing external repositories) against your project's vendor/subprocessor JSON manifest:

```bash
node skills/kvkk-cross-border-art9/scripts/audit-subprocessors.mjs \
  --file /path/to/subprocessors.json \
  --json
```

The auditor flags:
- **P0 (`ART9_ILLEGAL_EXPLICIT_CONSENT`):** Explicit consent used on a `CONTINUOUS` or `SYSTEMATIC` foreign transfer.
- **P0 (`ART9_SCC_NOTIFICATION_OVERDUE`):** Signed Standard Contract (`SCC_SIGNED`) without `kvkk_notification_date` past 5 business days (Article 18/1-d fine `90,308 - 1,806,177 TL` applies to BOTH *Veri Sorumlusu* and *Veri Isleyen*).
- **P0 (`ART9_SCC_LATE_FILING` / `ART9_MISSING_SCC_MODULE`):** `SCC_FILED` vendor missing `SS-1`..`SS-4` module designation or filed `> 5` business days after signature.
- **P0 (`ART9_ARIZI_ON_CONTINUOUS`):** `ARIZI_EXCEPTION` (Art. 9/6) cited for recurring/continuous SaaS or infrastructure transfers.
- **P0 (`ART9_MISSING_MECHANISM`):** Foreign-hosted, foreign-controlled, or foreign-control-plane vendor missing a valid Article 9 safeguard.

## Step 2: Apply the 3-Tier Article 9 Decision Hierarchy

Evaluate every non-Turkish data flow under the **two-stage cumulative rule** (a valid Article 5/2 or 6/3 primary legal basis is mandatory before applying Article 9; a Standard Contract never cures an invalid primary basis):
1. **Tier 1 - Adequacy Decision (*Yeterlilik Karari*, Art. 9/1):** Verify whether the KVKK Board has published an active adequacy decision covering the destination country, international organization, or specific sector.
2. **Tier 2 - Appropriate Safeguards (*Uygun Guvenceler*, Art. 9/4):** Require an Article 5 or 6 legal basis, effective judicial/administrative remedies in the destination jurisdiction, and one safeguard:
   - Non-international agreement between public institutions with Board permission (Art. 9/4-a).
   - Board-approved Binding Corporate Rules (*Baglayici Sirket Kurallari* - BCR, Art. 9/4-b).
   - **Standard Contracts (*Standart Sozlesmeler* SS-1 through SS-4, Decision 2024/959 & Jan 2025 Guide):** Populate only the Annexes and official optional clauses without altering Board text, attach notarized/apostilled signatory authority docs and sworn Turkish translations (*yeminli tercume*), and **notify the KVKK Authority within 5 business days** of signature completion, **amendments**, or **termination** (via KEP, physical filing, or the Standard Contract Notification Module).
   - Written undertaking with Board approval (Art. 9/4-ç).
3. **Tier 3 - Occasional Derogations & Chain Rules (Art. 9/6 - 9/8):** Valid ONLY for strictly isolated, non-repetitive transfers (excluding public-law activities under Art. 9/7 for Art. 9/6-a/b/c), and apply identical Art. 9 safeguards to **onward transfers** (*sonraki aktarimlar*, Art. 9/8).

## Step 3: Verify Sovereign Turkish Infrastructure & Control Planes

Hosting compute in Istanbul or Ankara does not automatically eliminate Article 9 transfers:
1. **Foreign Control-Plane Telemetry:** Inspect managed cloud databases, CDNs, WAFs, Kubernetes control planes, error trackers, and LLM/OCR APIs for out-of-band telemetry, metadata, or billing/support access routed to US/EU control planes (`foreign_control_plane: true`).
2. **Remote Support Access:** If foreign support engineers can query production databases or read unmasked logs (`subprocessor_access_from_abroad: true`), treat that access path as an Article 9 transfer requiring Standard Contracts or technical isolation (zero remote access / BYOK encryption).
3. **Subprocessor Cascade:** When a *Veri Isleyen* transfers data to a foreign subprocessor, verify whether **SS-3 (Processor-to-Processor)** applies and ensure the 5-business-day Authority notification obligation is explicitly assigned and tracked.
