# KVKK Article 9 Cross-Border Transfer Decision Tree (Post-Sept 1, 2024)

> **Notice:** Technical compliance engineering decision tree for Law No. 6698 Article 9 as amended by Law No. 7499.
> Not formal Turkish legal advice (*hukuki mutalaa*).

## 1. Threshold Question: Is There an Article 9 Cross-Border Transfer?

An Article 9 transfer occurs whenever personal data is transmitted outside Turkiye OR accessed remotely from outside Turkiye, including:
- Storing databases, object buckets, or backups in foreign cloud regions (e.g., `eu-central-1`, `us-east-1`).
- Browser-side calls to foreign CDNs, fonts, analytics, or captcha endpoints.
- Calling foreign LLM, OCR, email delivery, SMS, payment, or monitoring APIs.
- Foreign parent-company or vendor support staff viewing production data or logs remotely.
- Using a "local zone" whose control plane, WAF logs, or IAM metadata replicates outside Turkiye.

## 2. Two-Stage Cumulative Requirement (Art. 5/6 + Art. 9)

Article 9 is ALWAYS a **second, cumulative layer** on top of Articles 5 and 6 across all three tiers below.
A Standard Contract or Adequacy Decision NEVER cures a missing or invalid primary processing legal basis under Article 5/2 or unified Article 6/3.

## 3. Three-Tier Statutory Hierarchy

### Tier 1 - Adequacy Decision (*Yeterlilik Karari*, Art. 9/1)
- Requires an explicit KVKK Board adequacy decision for the destination country, international organization, or sector within that country.
- Reviewed at least once every 4 years by the Board.

### Tier 2 - Appropriate Safeguards (*Uygun Guvenceler*, Art. 9/4)
Available only when an Article 5 or Article 6 legal basis exists AND the *Ilgili Kisi* has the opportunity to exercise rights and apply for effective legal remedies in the destination country:

| Mechanism | Statutory Provision | Approval / Notification Rule |
|:---|:---|:---|
| Public non-international agreement | Art. 9/4-a | Requires prior KVKK Board permission |
| Binding Corporate Rules (BCR) | Art. 9/4-b | Requires KVKK Board approval |
| **Standard Contracts (SS-1 to SS-4)** | **Art. 9/4-c & 9/5** | **No prior approval; MUST be notified to KVKK Authority within 5 business days of signature** |
| Written undertaking | Art. 9/4-ç | Requires prior KVKK Board permission |

### Standard Contract Modules Matrix

| Module | Transfer Direction | Typical Engineering Scenario |
|:---|:---|:---|
| **SS-1** | *Veri Sorumlusu* (TR) -> *Veri Sorumlusu* (Abroad) | Independent foreign payment partner, identity verification authority, or joint commercial partner |
| **SS-2** | *Veri Sorumlusu* (TR) -> *Veri Isleyen* (Abroad) | Turkish app using foreign-hosted SaaS, cloud provider, managed email/SMS, or analytics processor |
| **SS-3** | *Veri Isleyen* (TR/Abroad) -> *Veri Isleyen* (Abroad) | Turkish processor engaging a foreign sub-processor (infrastructure, support, or sub-API) |
| **SS-4** | *Veri Isleyen* (TR) -> *Veri Sorumlusu* (Abroad) | Turkish software/BPO processor returning processed datasets to a foreign controller |

### 5-Business-Day Notification, Board Decision 2024/959 & January 2025 Guide Rules
Under **Board Decision No. 2024/959 (04.06.2024)** and the **January 2025 Cross-Border Transfer Guide** (*Yurt Disina Kisisel Veri Aktarimi Rehberi*):
- **5-Business-Day (*5 is gunu*) Deadline (Art. 9/5 & Art. 18/1-d):** Signed Standard Contracts must be notified to the KVKK Authority within **5 business days** counted from the signature completion date (excluding weekends and Turkish official public holidays, *resmi tatiller*).
- **Dual Liability:** Failure to notify on time triggers an Article 18/1-d administrative fine (`90,308 - 1,806,177 TL` in 2026) directly on **both** the *Veri Sorumlusu* and the *Veri Isleyen* (Art. 18/2).
- **Text Immutability:** Parties may ONLY populate the Annexes (*Ekler*) and select official optional/alternative clauses; any unilateral modification to the Board-published contract wording invalidates the Standard Contract and requires prior Board permission under Article 9/4-ç.
- **Supporting Filings:** Notifications must attach notarized signatory authority documents (*imza sirkuleri* / power of attorney, apostilled or consular-legalized when executed abroad) and sworn Turkish translations (*yeminli tercume*) of any foreign-language documents or bilingual counterparts.
- **Mandatory Lifecycle Notifications:** Parties must ALSO notify the KVKK Authority within **5 business days** of any **amendments** (party or annex changes) or **termination (*sona erme*)** of the Standard Contract, not solely its initial execution.

### Onward Transfers (*Sonraki Aktarimlar*, Art. 9/8)
- Any onward transfer by a foreign recipient to a subsequent third party or sub-subprocessor outside Turkiye MUST satisfy the exact same Article 9 safeguards across the chain (for example, executing and filing **SS-3** for processor-to-subprocessor transfers and enforcing downstream Annex disclosures).

### Tier 3 - Occasional Derogations (*Arizi Haller*, Art. 9/6 & Art. 9/7)
Permitted **only** when neither Tier 1 nor Tier 2 exists AND the transfer is strictly **occasional, non-repetitive, and non-systematic** (*arizi*):
- **Art. 9/6-a:** Explicit consent of the *Ilgili Kisi* given after informing them of the specific risks arising from the absence of adequacy and appropriate safeguards.
- **Art. 9/6-b / c:** Occasional transfer necessary for contract performance or conclusion in the interest of the data subject.
- **Art. 9/6-ç / d / e / f:** Overriding public interest, legal claims, physical/legal impossibility to protect life, or public registry inspection.
- **Public-Authority Restriction (Art. 9/7):** The occasional derogations in Article 9/6-a, 9/6-b, and 9/6-c do NOT apply to activities carried out by public institutions and organizations within the scope of public law (*kamu hukukuna tabi faaliyetler*).
- **Strict Prohibition:** Never classify continuous user onboarding, daily backups, SaaS telemetry, or recurring API calls as *arizi*.
