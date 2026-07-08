# Data Processing Agreement (Template)

> ⚠️ **This is a starting template, not legal advice.** Have it reviewed by a
> qualified Indian data-protection lawyer before signing. It is drafted for the
> Digital Personal Data Protection Act, 2023 (DPDP) and the SPDI Rules, 2011.

This DPA governs the processing of personal data (including patient voice
recordings and clinical details — "Health Data") in connection with the Gooqi
Health Transcriber service.

## 1. Parties & roles

| Role | Party | Notes |
|------|-------|-------|
| **Data Fiduciary** (Controller) | The Clinic / Doctor | Determines purpose & means; obtains patient consent |
| **Data Processor** | Gooqi (service operator) | Processes Health Data only on documented instructions |
| **Sub-processors** | ASR vendor, LLM vendor, hosting/storage | Listed in Annex A; each must sign an equivalent DPA |

Under DPDP, the patient is the **Data Principal**. The Clinic is the Data
Fiduciary and bears primary consent obligations; Gooqi acts strictly as a
Processor.

## 2. Subject matter & duration

- **Subject matter:** transcription of doctor–patient consultations and
  generation of structured clinical notes.
- **Duration:** the term of the service agreement; obligations on deletion and
  confidentiality survive termination.

## 3. Nature & purpose of processing

Recording, chunked upload, automatic speech recognition, LLM-based SOAP/
prescription generation, storage, and doctor review/sign-off — solely to
produce clinical documentation for the Clinic. No secondary use (advertising,
model training on identifiable data, resale) without separate, explicit consent.

## 4. Categories of data & data principals

- **Data principals:** patients; treating doctors (as users).
- **Personal data:** patient name, phone, consultation audio, transcripts,
  diagnoses, prescriptions, visit summaries. This includes **health data**
  (sensitive personal data under the SPDI Rules).

## 5. Processor obligations (Gooqi)

Gooqi shall:

1. Process Health Data **only on the Clinic's documented instructions**.
2. Ensure personnel are bound by confidentiality.
3. Implement the **technical & organisational measures** in Annex B.
4. Engage **no sub-processor** without prior authorisation; flow down equivalent
   obligations (Annex A).
5. Assist the Clinic with data-principal rights requests (access, correction,
   erasure, grievance redressal) and with breach notification.
6. **Notify the Clinic without undue delay** (target: **72 hours**) after
   becoming aware of a personal-data breach, per DPDP §8(6).
7. At the Clinic's choice, **delete or return** all Health Data at end of term
   and delete existing copies, subject to the retention schedule (§7).
8. Make available information necessary to demonstrate compliance and submit to
   audits.

## 6. Controller obligations (Clinic)

1. Obtain **free, specific, informed, unambiguous** consent from each patient
   before recording, in a language the patient understands (the product logs
   `consent_language` per consent record).
2. Provide the DPDP notice (purpose, rights, grievance contact).
3. Issue only lawful processing instructions.

## 7. Retention & deletion

| Data | Retention | Basis |
|------|-----------|-------|
| Raw consultation audio | **≤ 30 days**, then purged | Minimisation; note is the record of value |
| Clinical notes / prescriptions | Per medical-records law (**3–7 years**) | Clinical Establishments Act / MCI guidance — cite the specific applicable rule |
| Consent log | Append-only, retained for the records' lifetime | Auditability (SC-3) |

> **Action:** confirm the exact retention period with counsel and cite it here.
> The codebase implements a 30-day audio purge (`audio_purged_at`) — keep the
> contract and the code in agreement.

## 8. International transfers

If any sub-processor stores or processes Health Data **outside India**, the
transfer must comply with DPDP §16 and any Government restrictions. Prefer
India-resident processing (e.g. an ASR vendor with Indian data residency).
Record each sub-processor's data-residency in Annex A.

## 9. Liability, term, governing law

Governed by the laws of India; courts at **[city]**. Liability as per the
underlying service agreement.

---

## Annex A — Authorised sub-processors

| Sub-processor | Service | Data-residency | DPA signed? |
|---------------|---------|----------------|-------------|
| _[ASR vendor]_ | Speech-to-text | _[India / other]_ | ☐ |
| _[LLM vendor]_ | Note generation | _[region]_ | ☐ |
| _[Hosting/storage]_ | Storage, queue | _[region]_ | ☐ |

> **Blocker (OQ-4):** no patient audio may be sent to an ASR sub-processor until
> its DPA is signed and recorded here. Until then, run `ASR_PROVIDER=mock` (dev)
> or a self-hosted provider (`faster_whisper`) that keeps audio in-house.

## Annex B — Technical & organisational measures

- Encryption in transit (TLS) and at rest (provider-managed keys).
- Row-Level Security scoping every record to its owning doctor.
- **Multi-factor authentication** available for doctor accounts (TOTP).
- **Re-authenticated, attributable sign-off** on every finalised note (IT Act
  2000 §5) — method, IP, user-agent and timestamp recorded.
- Append-only consent log enforced by a database trigger.
- Audio minimisation: chunked storage, 30-day purge.
- Access logging and least-privilege service credentials.

_Signatures:_ __________________________ (Clinic)  __________________________ (Gooqi)  Date: __________
