---
name: kvkk-backend-architecture
description: >-
  Architects and validates KVKK-compliant backend systems and databases:
  append-only PostgreSQL consent ledgers with SHA-256 policy hash binding,
  Board Decision 2018/10 technical controls for Article 6 special category data,
  6-month periodic destruction (Periyodik Imha) with 3-year audit logs, Law
  No. 5651 and VUK/TTK retention carve-outs, non-production PII masking, and
  Kisisel Veri Isleme Envanteri validation.
license: Apache-2.0
metadata:
  author: anylogy
  version: "2.0.0"
  domain: privacy
  subdomain: backend-privacy-engineering
  tags: "kvkk, postgresql, consent-ledger, decision-2018-10, periyodik-imha, inventory"
---

# KVKK Backend & Database Architecture

> **Compliance Engineering Notice:** This skill and its artifacts are technical compliance engineering tools.
> They do not constitute formal Turkish legal advice (*hukuki mutalaa*) and must be reviewed with qualified Turkish legal counsel before production deployment.

## Purpose and Scope

Use this skill to design, audit, and enforce KVKK technical controls across backend APIs, PostgreSQL schemas, KMS encryption pipelines, and automated data lifecycle jobs.

Load supporting artifacts on demand:
- Board Decision 2018/10 technical security controls mapping: `references/decision-2018-10-controls.md`
- Immutable PostgreSQL consent & destruction ledger DDL: `assets/consent-ledger-postgres.sql`
- Machine-readable *Kisisel Veri Isleme Envanteri* validator: `scripts/validate-inventory.mjs`

## Step 1: Validate the Data Inventory First

Run `scripts/validate-inventory.mjs` (fully self-contained inside this skill directory with zero cross-folder runtime dependency on `kvkk-core-law-2026` when installed standalone) against your project's `KVKK_INVENTORY_SEED.json` or inventory export:

```bash
node skills/kvkk-backend-architecture/scripts/validate-inventory.mjs \
  --file /path/to/KVKK_INVENTORY_SEED.json \
  --json
```

The validator enforces all mandatory *Veri Sorumlulari Sicili Hakkinda Yonetmelik* Art. 5 elements and fails with exit code 1 if any activity:
- Omits `process_name`, `data_subject_group`, `data_categories`, `processing_purposes`, explicit `domestic_recipients`/`recipient_groups`, or `technical_and_administrative_measures`.
- Uses `EXPLICIT_CONSENT` or `ARIZI_EXCEPTION` for a `CONTINUOUS` or `SYSTEMATIC` foreign transfer.
- Processes Article 6 special category data without a valid post-June 1, 2024 `6/3-a` through `6/3-g` basis (or cites repealed `6/2`).
- Lacks any mandatory Board Decision 2018/10 technical control for Article 6 records.
- Omits a concrete retention period, declares an indefinite/unbounded retention (`Suresiz`/`unlimited`), sets `periodic_destruction_months > 6`, or retains destruction logs `< 3` years.
- Uses forbidden GDPR-only identifiers (`GDPR_ART_6`, `GDPR_ART_9`, `GDPR_ART_30`, `ROPA`, `DPO`, `EU_SCC`).

## Step 2: Deploy an Immutable Consent Ledger

Deploy `assets/consent-ledger-postgres.sql` to guarantee evidentiary proof of *Aydinlatma* delivery and *Acik Riza* grant/revocation under Article 5/1 and Article 6/3-a without retaining unbounded raw PII after Article 7 erasure:
1. Store every published *Aydinlatma Metni* and *Acik Riza* text version in `kvkk_legal_text_versions` keyed by its deterministic UTF-8 SHA-256 hash.
2. Keep operational PII in separate erasable tables while recording every `GRANT` or `REVOKE` event in `kvkk_consent_events` against a pseudonymized `subject_ref_hash` and a bounded `proof_retain_until` window (statutory claim limitation period under Art. 5/2-e).
3. Enforce database-level immutability via `BEFORE UPDATE OR DELETE` trigger (`kvkk_prevent_mutation()`), blocking all updates and allowing deletes ONLY on expired rows inside an authorized retention-purge transaction (`SET LOCAL kvkk.allow_retention_purge = 'on'`).

## Step 3: Implement Board Decision 2018/10 Controls for Art. 6 Data

For any table or object store holding health, biometric, genetic, religion, blood type, criminal conviction, or incidental ID-scan special category data, enforce all controls in `references/decision-2018-10-controls.md`:
1. Maintain a dedicated Special Category Data Security Policy.
2. Encrypt data at rest using envelope encryption (AES-256-GCM) with keys isolated in HSM/KMS (HYOK where applicable).
3. Restrict decryption privileges via RBAC least-privilege roles and enforce phishing-resistant 2FA plus mTLS/VPN for remote administrative access.
4. Emit immutable, time-synchronized audit logs for every read, export, decrypt, and delete operation.
5. Bind staff with written confidentiality agreements and annual Article 6 security training.

## Step 4: Automate 6-Month Periyodik Imha & Statutory Carve-Outs

Under the Regulation on Erasure, Destruction or Anonymization of Personal Data and TCK Article 138:
1. Schedule a deterministic job every **<= 6 months** to erase, physically destroy, or irreversibly anonymize records whose processing purpose and retention period have expired.
2. Enforce statutory carve-outs before deletion so legally mandated records remain intact until expiry:
   - **Law No. 5651:** Internet access/traffic logs (2 years for hosting/access providers where applicable).
   - **VUK & TTK:** Invoices, accounting ledgers, and commercial books (5 to 10 years).
3. Write every periodic or DSAR-triggered destruction batch to `kvkk_destruction_logs` and retain those logs for a minimum of **3 years**.

## Step 5: Mask PII in Non-Production Environments

Never restore raw production PostgreSQL dumps or object-storage buckets into development, staging, or CI environments.
Apply deterministic tokenization or synthetic generation during snapshot export, and strip all Article 6 columns and document scans completely from non-production datasets.
