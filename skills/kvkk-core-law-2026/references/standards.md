# Turkish KVKK Authoritative Statutory Map (November 2026)

> **Notice:** This reference summarizes Turkish statutory provisions and KVKK Board Decisions for technical compliance engineering.
> It is not formal Turkish legal advice (*hukuki mutalaa*).

## 1. Primary Legislation: Law No. 6698 (as Amended by Law No. 7499)

Law No. 6698 (*Kisisel Verilerin Korunmasi Kanunu*) entered into force on 7 April 2016 and underwent structural reform under Law No. 7499 (published 12 March 2024).
The Article 6 reform took effect on 1 June 2024, and the Article 9 cross-border transfer reform took full effect on 1 September 2024.

### Article 4 - Core Processing Principles
Every personal data processing pipeline must satisfy all five principles cumulatively:
1. Lawfulness and fairness (*Hukuka ve durustluk kurallarina uygun olma*).
2. Accuracy and, where necessary, currency (*Dogru ve gerektiginde guncel olma*).
3. Processing for specific, explicit, and legitimate purposes (*Belirli, acik ve mesru amaclar icin islenme*).
4. Relevance, limitation, and proportionality to the purpose (*Islendikleri amacla baglantili, sinirli ve olculu olma*).
5. Retention only for the period foreseen in legislation or required for the processing purpose (*Ilgili mevzuatta ongorulen veya islendikleri amac icin gerekli olan sure kadar muhafaza edilme*).

### Article 5 - Processing Conditions for General Personal Data
- **Art. 5/1:** Explicit consent (*Acik Riza*) - freely given, specific to a defined subject, and based on prior information.
- **Art. 5/2-a:** Expressly provided for by laws (*Kanunlarda acikca ongorulmesi*).
- **Art. 5/2-b:** Mandatory for protection of life or physical integrity of the data subject or another person where consent cannot be given due to physical or legal impossibility.
- **Art. 5/2-c:** Processing of personal data of parties to a contract, directly related to the establishment or performance of that contract.
- **Art. 5/2-ç:** Mandatory for the *Veri Sorumlusu* to fulfill its legal obligation.
- **Art. 5/2-d:** Made public by the *Ilgili Kisi* themselves.
- **Art. 5/2-e:** Mandatory for the establishment, exercise, or defense of a right.
- **Art. 5/2-f:** Mandatory for the legitimate interests of the *Veri Sorumlusu*, provided it does not harm fundamental rights and freedoms of the *Ilgili Kisi*.

### Article 6 - Special Category Personal Data (Post-June 1, 2024)
Special category personal data comprises race, ethnic origin, political opinion, philosophical belief, religion, sect or other belief, appearance and dress, membership of associations/foundations/trade unions, health, sexual life, criminal convictions and security measures, and biometric and genetic data.
Old Article 6/2 is repealed.
Under current Article 6/3, processing any special category data is prohibited unless one of **8 unified bases** applies:
- **Art. 6/3-a:** Explicit consent of the *Ilgili Kisi*.
- **Art. 6/3-b:** Expressly provided by laws.
- **Art. 6/3-c:** Mandatory for protecting life or physical integrity under physical/legal impossibility to give consent.
- **Art. 6/3-ç:** Made public by the *Ilgili Kisi* and consistent with their intent to make it public.
- **Art. 6/3-d:** Mandatory for the establishment, exercise, or defense of a right.
- **Art. 6/3-e:** Necessary for public health, preventive medicine, medical diagnosis, treatment and care services, or planning, management, and financing of health services by persons under a secrecy obligation or authorized institutions.
- **Art. 6/3-f:** Mandatory for fulfilling legal obligations in employment, occupational health and safety, social security, social services, and social assistance.
- **Art. 6/3-g:** Processing by non-profit foundations, associations, or unions of political, philosophical, religious, or trade-union nature concerning current/former members or regular contacts, strictly aligned with organizational purposes and without external disclosure.

**Identity Document Engineering Rule:**
Nationality (*uyruk*) by itself is general data under Article 5.
However, passport scans, *Kimlik* cards, and *Ikamet Izni* documents often expose religion, blood type, biometric facial templates, or criminal records.
Systems processing document scans must apply Article 6/3 bases and Board Decision 2018/10 controls unless incidental special category attributes are deterministically stripped before persistence.

### Article 9 - Cross-Border Transfers (Post-Sept 1, 2024)
Explicit consent is prohibited as a standing legal basis for continuous or systematic transfers outside Turkiye.
1. **Tier 1 - Adequacy Decision (*Yeterlilik Karari*, Art. 9/1):** Transfer based on a published KVKK Board adequacy decision.
2. **Tier 2 - Appropriate Safeguards (*Uygun Guvenceler*, Art. 9/4):** Requires an Article 5 or 6 legal basis plus effective legal remedies and one of:
   - Non-international agreement between Turkish and foreign public institutions/organizations with Board permission (Art. 9/4-a).
   - Binding Corporate Rules (*Baglayici Sirket Kurallari* - BCR) approved by the Board (Art. 9/4-b).
   - Standard Contracts (*Standart Sozlesmeler* - SS-1, SS-2, SS-3, SS-4) published by the Board and notified to the KVKK Authority within **5 business days** of signature (Art. 9/4-c).
   - Written undertaking containing protective provisions with Board permission (Art. 9/4-ç).
3. **Tier 3 - Occasional Derogations (*Arizi Haller*, Art. 9/6):** Permitted only when non-repetitive and occasional, including risk-informed explicit consent (Art. 9/6-a) or narrow contract/right/public-interest grounds.

### Article 18 - Administrative Fines & Judicial Remedy (Post-June 1, 2024)
- **2026 Fine Schedule:** Updated by the 25.49% revaluation rate effective 1 January 2026 (see `references/fines-2026.json`).
- **Dual Controller/Processor Liability (Art. 18/2):** Article 18/1-d (failure to notify Standard Contracts within 5 business days) uniquely applies to both the *Veri Sorumlusu* and the *Veri Isleyen*.
- **Judicial Remedy (Art. 18/3 & IYUK Art. 7):** Effective 1 June 2024 (Law No. 7499), administrative fines issued by the KVKK Board must be challenged before **Administrative Courts (*Idare Mahkemeleri*) within 60 days** of notification under Law No. 2577 (IYUK) Article 7, replacing the repealed *Sulh Ceza Hakimligi* appeal route.

## 2. Verified KVKK Board Decisions

| Decision No. | Date | Verified Statutory Subject | Operational Requirement |
|:---|:---|:---|:---|
| **2018/10** | 31.01.2018 | Adequate measures for Art. 6 special category data | Separate policy, employee NDA/training, encryption, KMS, audit logs, 2FA remote access, physical security |
| **2019/10** | 24.01.2019 | Data breach notification procedure | Mandatory notification to the KVKK Board within **72 hours** of learning of the breach |
| **2019/271** | 18.09.2019 | Data breach notice to affected *Ilgili Kisi* | Mandatory minimum notice contents (timing, affected categories, impact, mitigation, contact) |
| **2023/1154** | 06.07.2023 | General VERBIS exemption revision | Exempt if `< 50` annual employees AND `< 100,000,000 TL` annual financial balance sheet total |
| **2025/1572** | 04.09.2025 | Art. 6 primary-activity VERBIS micro-exemption | Exempt if domestic Art. 6 primary controller has `< 10` annual employees AND `< 10,000,000 TL` balance sheet total |
| **2025/2393** | 25.12.2025 (ann. 12.01.2026) | Bookkeeping-basis rule & Art. 6 micro-exemption clarification | Controllers keeping books on a **balance-sheet basis (*bilanço esasi*)** are evaluated on BOTH employee count (`< 10` Art. 6 primary / `< 50` general) AND annual financial balance sheet total (`< 10M TL` / `< 100M TL`); controllers **not on a balance-sheet basis** are evaluated on **annual employee count only** |

## 3. Secondary Legislation & Linked Turkish Laws

- **Clarification Communique** (*Aydinlatma Yukumlulugunun Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkinda Teblig*): Governs mandatory Article 10 elements, layered notices, and strict separation from *Acik Riza*.
- **Application Communique** (*Veri Sorumlusuna Basvuru Usul ve Esaslari Hakkinda Teblig*): Defines mandatory Article 11 application fields, permitted delivery channels, identity verification proportionality, and the strict **30-day** response deadline.
- **Erasure, Destruction, and Anonymization Regulation** (*Kisisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkinda Yonetmelik*): Mandates a **maximum 6-month periodic destruction** (*periyodik imha*) cycle and retention of destruction logs for at least **3 years**.
- **KVKK Cookie Guidelines** (*Cerez Uygulamalari Rehberi*): Requires prior opt-in for non-essential cookies, equal visual prominence for "Accept All" and "Reject All" on layer 1, and bans pre-ticked boxes or cookie walls.
- **Law No. 6563 (ETK) & IYS:** Commercial electronic message consent via IYS is legally distinct from KVKK Article 5/1 *Acik Riza* and must be decoupled in UI and consent ledgers.
- **Law No. 5651 & VUK/TTK Retention Carve-Outs:** Hosting/access traffic logging (Law No. 5651) and tax/commercial book retention (VUK/TTK) override deletion requests under Article 5/2-a and 5/2-ç until statutory periods expire.
- **Turkish Penal Code (TCK) Articles 135-140:** Establishes criminal imprisonment liability for unlawful recording (Art. 135), unlawful delivery/acquisition (Art. 136), qualified aggravating circumstances (Art. 137), and failure to destroy data after statutory expiry (Art. 138).

## 4. KVKK-vs-GDPR Anti-Confusion Guardrails

- Never refer to a *Veri Sorumlusu* contact person (*Irtibat Kisisi*) as a GDPR Data Protection Officer (DPO).
- Never refer to a *Kisisel Veri Isleme Envanteri* as a GDPR Article 30 ROPA.
- Never apply GDPR Article 45/46 SCC logic directly without mapping to KVKK SS-1 to SS-4 and the 5-business-day Authority filing rule.
- Never use annual turnover (*ciro*) as the VERBIS financial test; KVKK uses annual financial balance sheet total (*yillik mali bilanço toplami*).
- Never rely on explicit consent for continuous or systematic cross-border transfers under post-2024 Article 9.
