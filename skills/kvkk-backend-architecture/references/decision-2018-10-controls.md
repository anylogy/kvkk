# Board Decision 2018/10 (31.01.2018) - Engineering Controls Mapping

> **Notice:** Technical engineering interpretation of KVKK Board Decision No. 2018/10 for Article 6 Special Category Personal Data.
> Not formal Turkish legal advice (*hukuki mutalaa*).

## Statutory Requirement

Whenever a *Veri Sorumlusu* processes Article 6 special category personal data (including incidental religion, blood type, biometric facial templates, or criminal records from identity document scans), it must implement adequate measures determined by the KVKK Board in Decision 2018/10 in addition to general Article 12 security measures.

## Engineering Mapping Matrix

| Decision 2018/10 Clause | Required Control | Concrete Backend / Infra Implementation |
|:---|:---|:---|
| **1. Separate Policy** | Systematic, clear, manageable internal policy and procedure dedicated to special category data | Version-controlled `KVKK_ART6_SECURITY_POLICY.md` mapped directly to table/bucket classifications and automated CI policy checks |
| **2. Employee Confidentiality & Training** | Regular training on KVKK and special category security, signed NDAs, clear role definitions, immediate revocation on termination | Automated IAM offboarding within 1 hour of HR termination event; annual signed confidentiality attestation log |
| **3. Electronic Environment Security - Cryptography** | Cryptographic storage and cryptographic transfer of special category data | TLS 1.3 strictly enforced in transit; AES-256-GCM application-layer envelope encryption or column-level encryption before PostgreSQL/S3 persistence |
| **4. Key Management** | Cryptographic keys stored in secure, physically/logically separate environments | Dedicated KMS/HSM with Customer Managed Keys (CMK) or Hold Your Own Key (HYOK); keys never stored in `.env`, git, or alongside database dumps |
| **5. Audit Logging** | Tamper-evident transaction logging (who, when, what) with continuous security monitoring | Immutable append-only audit stream (WORM bucket or separate log DB) capturing every `SELECT`, decrypt, export, and `DELETE` on Art. 6 tables |
| **6. Software & Vulnerability Lifecycle** | Regular security updates and periodic vulnerability/penetration testing | Automated dependency/container CVE gating in CI, monthly OS patching, and periodic penetration testing |
| **7. Remote Access Security** | At least two-factor authentication (2FA) for remote access to special category systems | FIDO2/WebAuthn or TOTP 2FA mandatory on VPN, bastion/SSH, KMS console, and database admin jump hosts |
| **8. Paper / Physical & Media Transfer** | Locked cabinets, restricted physical access, fire/flood protection, sealed/encrypted media transfer | Avoid paper handling; if physical documents exist, log custody, digitize to encrypted Turkish storage, and cross-cut shred physical copies |

## Incidental Article 6 Data From Document Scans

If a service collects Turkish *Kimlik*, foreign passport, or residence permit (*Ikamet*) images strictly for Article 5 identity verification:
1. Isolate document images in an encrypted private bucket hosted in Turkiye (`no public URLs`).
2. Extract only mandatory Article 5 attributes, avoid persisting religion or blood type fields, and expire raw document scans on the shortest defensible retention window.
3. Until automated redaction/purging is verified, classify the entire upload pipeline under Decision 2018/10 controls.
