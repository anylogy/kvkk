# KVKK Article 11 DSAR & Data Breach Response SLAs

> **Notice:** Technical engineering checklist anchored to the Application Communique (*Veri Sorumlusuna Basvuru Usul ve Esaslari Hakkinda Teblig*) and KVKK Board Decisions 2019/10 and 2019/271.
> Not formal Turkish legal advice (*hukuki mutalaa*).

## 1. Article 11 Data Subject Request (DSAR) Rules

### Mandatory Application Elements (Application Communique Art. 5/2)
Every written or electronic *Ilgili Kisi* application must include:
1. Name, surname, and signature (if submitted on paper).
2. Republic of Turkiye Identity Number (TCKN) for Turkish citizens; nationality (*uyruk*) and passport number (or foreign ID number if available) for non-citizens.
3. Residential or workplace address for notification.
4. Electronic mail address, telephone, and fax number for notification (if available).
5. Subject of the request (mapped to KVKK Art. 11/1 rights) and supporting documents, if any.

### Permitted Submission Channels
- Written physical delivery (in person or via notary).
- Registered Electronic Mail (KEP), secure electronic signature, or mobile signature.
- Electronic mail sent from the *Ilgili Kisi*'s email address previously registered in the controller's system.
- Dedicated application software/portal implemented by the controller.

### Identity Verification Minimization
- Authenticate logged-in portal requests using existing verified session + step-up OTP.
- Never force applicants to upload unredacted passport or *Kimlik* scans when existing verified account channels or KEP/e-signature suffice.
- Purge temporary identity verification artifacts immediately after completing verification.

### 30-Day SLA & Fee Rules
- The *Veri Sorumlusu* must conclude the request as soon as possible and within **30 calendar days** at the latest.
- Applications are free of charge unless a written response exceeds 10 pages (up to 1 TL per page thereafter) or is delivered on physical recording media (cost of the media only).
- If the request stems from controller error, any collected fee must be refunded.

### Mandatory Written Response Elements (Application Communique Art. 6/3)
Every response communicated to the *Ilgili Kisi* (in writing or electronically) must state:
1. Information identifying the *Veri Sorumlusu* or its representative.
2. Applicant's name, surname, TCKN (or passport/foreign ID + nationality), address for notification, and contact details.
3. Subject of the request.
4. Clear controller explanations regarding the application (measures taken for accepted requests, or reasoned legal grounds for rejection).

### Article 14 KVKK Board Complaint Window
- Applying to the *Veri Sorumlusu* under Article 13 is mandatory before escalating to the KVKK Board (Art. 14/2).
- If the application is rejected, the response is found insufficient, or no response is given within 30 days, the *Ilgili Kisi* may file a complaint with the KVKK Board within **30 days** of learning of the response and in any event within **60 days** from the application date (Art. 14/1).

## 2. 72-Hour Data Breach Notification to KVKK Board (Decision 2019/10 - 24.01.2019)

1. The statutory phrase "as soon as possible" in KVKK Art. 12/5 is defined by Board Decision 2019/10 as **within 72 hours** of learning (awareness) of the personal data breach, using the official *Kisisel Veri Ihlali Bildirim Formu*.
2. **Immediate Processor-to-Controller Escalation:** If a *Veri Isleyen* detects the breach, it must notify the *Veri Sorumlusu* **without undue delay** (*gecikmeksizin*) so the controller can meet its 72-hour Board deadline.
3. If all forensic details cannot be collected within 72 hours, submit the initial notification on time and provide progressive updates without delay.
4. Maintain an internal breach register documenting impact, root cause, and remediation even when a security incident is evaluated for notification threshold.

## 3. Data Subject Breach Notice (Board Decision 2019/271 - 18.09.2019)

- **Timing Distinct From 72h Board Notice:** Once affected *Ilgili Kisi* individuals are identified, notify them **"as soon as reasonably possible"** (*makul olan en kisa surede*) directly if contact details are known, or via a clear public announcement on the controller's website if direct reach is impossible.
- Every breach notification sent to affected *Ilgili Kisi* individuals must clearly state in plain, intelligible language:
1. When the data breach occurred.
2. Which personal data categories were affected (distinguishing general vs. Article 6 special category data).
3. Potential consequences of the personal data breach.
4. Measures taken or proposed to mitigate negative effects of the breach.
5. Contact details of persons or communication channels (e.g., dedicated email/web page/call center) through which the *Ilgili Kisi* can obtain further information.
