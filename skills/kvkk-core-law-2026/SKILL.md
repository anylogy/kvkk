---
name: kvkk-core-law-2026
description: >-
  Implements Turkish KVKK (Law No. 6698, as amended by Law No. 7499 - November
  2026 standard) core statutory routing, Article 5 and Article 6/3 legal basis
  classification, Article 9 cross-border rules, VERBIS exemption evaluation,
  2026 Article 18 administrative fine lookups, and Turkish Data Inventory schema
  generation. Use when classifying personal data, determining processing legal
  bases, checking VERBIS thresholds, or mapping KVKK vs. GDPR terminology.
license: Apache-2.0
metadata:
  author: anylogy
  version: "2.0.0"
  domain: privacy
  subdomain: kvkk-compliance
  tags: "kvkk, law-6698, law-7499, verbis, article-5, article-6, article-9, fines-2026"
---

# KVKK Core Law (Law No. 6698 / Law No. 7499 - Nov 2026)

> **Compliance Engineering Notice:** This skill and its scripts are technical compliance engineering tools.
> They do not constitute formal Turkish legal advice (*hukuki mutalaa*) and must be reviewed with qualified Turkish legal counsel before regulatory filings or binding determinations.

## Purpose and Scope

Use this skill as the authoritative entry point for Turkish Personal Data Protection Law (KVKK, Law No. 6698, as amended by Law No. 7499) engineering assessments.
All rules reflect the post-June 1, 2024 (Article 6) and post-September 1, 2024 (Article 9) statutory regime as of November 2026.

Load supporting artifacts on demand:
- Statutory details, verified Board Decisions, TCK 135-140, and KVKK-vs-GDPR terminology table: `references/standards.md`
- 2026 Article 18 administrative fine schedule and 2027 revaluation indicator: `references/fines-2026.json`
- Official Turkish *Kisisel Veri Isleme Envanteri* schema: `assets/inventory-schema.json`
- VERBIS threshold and micro-exemption evaluator: `scripts/check-verbis-threshold.mjs`

## Step 1: Enforce KVKK Terminology

Never substitute GDPR concepts for statutory Turkish terms when drafting technical schemas, notices, or engineering controls.

| Concept | Authoritative KVKK Term | Forbidden GDPR Substitution |
|:---|:---|:---|
| Data Controller | *Veri Sorumlusu* | Controller under GDPR Art. 4(7) |
| Data Processor | *Veri Isleyen* | Processor under GDPR Art. 4(8) |
| Data Subject | *Ilgili Kisi* | Data Subject under GDPR |
| VERBIS Contact Person | *Irtibat Kisisi* | Data Protection Officer (DPO) |
| Processing Inventory | *Kisisel Veri Isleme Envanteri* | GDPR Article 30 ROPA |
| Privacy Notice | *Aydinlatma Metni* | GDPR Art. 13/14 Notice |
| Explicit Consent | *Acik Riza* | GDPR Art. 6(1)(a) Consent |
| Periodic Destruction | *Periyodik Imha* | Ad-hoc deletion |

## Step 2: Classify Data and Select Legal Basis

### General Personal Data (Article 5)
Check whether a statutory ground under Article 5/2 (`5/2-a` through `5/2-f`) applies before requesting *Acik Riza* (Article 5/1).
Relying on explicit consent when a statutory ground applies creates revocation risk and violates KVKK proportionality principles.

1. `5/2-a`: Expressly provided by law (*Kanunlarda acikca ongorulmesi*).
2. `5/2-b`: Physical or legal impossibility to protect life or bodily integrity.
3. `5/2-c`: Directly related to establishment or performance of a contract.
4. `5/2-ç`: Mandatory for the *Veri Sorumlusu* to fulfill a legal obligation.
5. `5/2-d`: Made public by the *Ilgili Kisi* themselves (strictly within public intent).
6. `5/2-e`: Mandatory for the establishment, exercise, or defense of a right.
7. `5/2-f`: Mandatory for legitimate interests of the *Veri Sorumlusu*, provided fundamental rights and freedoms are not harmed.

### Special Category Personal Data (Article 6 - Post-June 1, 2024)
Old Article 6/2 is repealed.
Article 6/3 establishes **8 unified legal bases** across all special categories (race, ethnic origin, political opinion, philosophical belief, religion/sect, appearance/dress, association/foundation/union membership, health, sexual life, criminal convictions/security measures, biometric and genetic data):

1. `6/3-a`: Explicit consent (*Acik Riza*).
2. `6/3-b`: Expressly provided by law.
3. `6/3-c`: Physical or legal impossibility to protect life or bodily integrity.
4. `6/3-ç`: Made public by the *Ilgili Kisi* in line with public intent.
5. `6/3-d`: Mandatory for establishment, exercise, or defense of a right.
6. `6/3-e`: Public health, preventive medicine, medical diagnosis, treatment/care, or health service planning/management by persons or authorized institutions under secrecy obligation.
7. `6/3-f`: Mandatory for fulfilling legal obligations in employment, occupational health and safety (OHS), social security, social services, and social assistance.
8. `6/3-g`: Processing by non-profit political, philosophical, religious, or trade-union foundations, associations, or organizations for current/former members or regular contacts within scope and without external disclosure.

**Critical Edge Case - Nationality vs. Scanned IDs:**
Nationality (*uyruk*) alone is general personal data under Article 5, NOT Article 6 special category data.
However, scanned national ID cards, passports, and residence permits routinely carry **incidental Article 6 data** such as religion fields, blood type/health annotations, biometric facial matching data, or criminal record extracts.
If your workflow ingests identity document scans or extracts those attributes, enforce Board Decision 2018/10 security controls and isolate or redact incidental special category fields immediately.

## Step 3: Route Cross-Border Transfers (Article 9 - Post-Sept 1, 2024)

Explicit consent is **illegal** for continuous, systematic transfers abroad.
Apply the 3-tier statutory hierarchy in strict order:
1. **Tier 1 - Adequacy Decision (*Yeterlilik Karari*, Art. 9/1):** Board adequacy decision for the destination country, international organization, or sector.
2. **Tier 2 - Appropriate Safeguards (*Uygun Guvenceler*, Art. 9/4):** Non-international public agreements, Board-approved Binding Corporate Rules (*Baglayici Sirket Kurallari* - BCR), Standard Contracts (*Standart Sozlesmeler* SS-1 through SS-4) notified to the KVKK Authority within **5 business days** of signature, or a written undertaking approved by the Board.
3. **Tier 3 - Occasional Derogations (*Arizi Haller*, Art. 9/6):** Strictly non-repetitive, occasional transfers (including explicit consent only after informing the data subject of specific transfer risks).

Route deep cross-border audits to the `kvkk-cross-border-art9` skill.

## Step 4: Evaluate VERBIS Registration Obligation

Run `scripts/check-verbis-threshold.mjs` (located inside this skill's directory when invoked from an external repository) with verified headcount and **annual financial balance sheet total** (*yillik mali bilanço toplami*, NEVER turnover/*ciro*):

```bash
node skills/kvkk-core-law-2026/scripts/check-verbis-threshold.mjs \
  --employees 12 \
  --balance-sheet-try 8500000 \
  --art6-primary \
  --json
```

Key threshold rules encoded in the script:
- **Decision 2023/1154 (06.07.2023):** General domestic exemption requires `< 50` annual employees AND `< 100,000,000 TL` annual financial balance sheet total.
- **Decisions 2025/1572 (04.09.2025) & 2025/2393 (25.12.2025, announced 12.01.2026):** Micro-exemption for domestic controllers whose primary business activity is processing Article 6 special category data requires `< 10` annual employees AND `< 10,000,000 TL` annual financial balance sheet total; Decision 2025/2393 clarifies that controllers keeping books on a **balance-sheet basis (*bilanço esasi*)** test both employee count and balance sheet total, whereas controllers **not on a balance-sheet basis** (`--non-balance-sheet`) test annual employee count only.
- **Always Required:** Foreign-established *Veri Sorumlusu* entities (`--foreign-controller`, which must register with VERBIS and appoint a *Veri Sorumlusu Temsilcisi* in Turkiye) and public institutions remain subject to VERBIS regardless of headcount, balance sheet, or bookkeeping basis.
- **No Compliance Waiver:** VERBIS exemption NEVER exempts a controller from Article 5/6 legal basis rules, Article 10 *Aydinlatma*, Article 12 security measures, Article 13 / Article 11 application responses, Board Decision 2018/10 controls, or maintaining an internal *Kisisel Veri Isleme Envanteri*.

## Step 5: Check 2026 Administrative Fine Exposure

Inspect `references/fines-2026.json` for exact 2026 Article 18 TRY ranges (including Art. 18/1-d `90,308 - 1,806,177 TL` on both controller and processor for missed 5-business-day Standard Contract notifications).
Always pair technical remediation with the responsible statutory obligation and fine bracket.
