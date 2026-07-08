# DPDP / SPDI Compliance Checklist

Status of the Digital Personal Data Protection Act 2023 (DPDP) and SPDI Rules
2011 obligations for the Gooqi Health Transcriber. ✅ = implemented in code,
🟡 = partial / needs configuration, ⬜ = process/legal action (not code).

Legend links point at the enforcing code where one exists.

## Consent (DPDP §6)

| Requirement | Status | Where |
|-------------|--------|-------|
| Consent captured before any recording (hard gate) | ✅ | `apps/api/src/routes/sessions.ts` — `consent.agreed !== true` → 400 |
| Consent shown in a language the patient understands | ✅ | EN/HI toggle in `sessions/new/page.tsx`; `CONSENT_TEXT_EN`/`_HI` |
| Language of consent recorded | ✅ | `consent_language` column + logged on every session |
| Append-only, immutable consent audit trail | ✅ | `0009_consent_log.sql` — `BEFORE UPDATE/DELETE` trigger |
| Consent notice (purpose, rights, grievance officer) | ⬜ | Add to patient-facing notice / ToS |
| Additional languages beyond EN/HI | 🟡 | Extend `CONSENT_TEXT_*` + toggle as pilot regions require |

## Security safeguards (DPDP §8(5), SPDI Rule 8)

| Requirement | Status | Where |
|-------------|--------|-------|
| Per-doctor data isolation | ✅ | RLS `0010_rls.sql` + ownership checks in API |
| Encryption in transit / at rest | ✅ | TLS + Supabase provider-managed encryption |
| MFA on accounts holding PHI | ✅ | TOTP enroll (`TwoFactorCard`), login challenge, middleware AAL2 enforcement |
| Attributable e-signature on sign-off (IT Act §5) | ✅ | Re-auth proof + `signoff_method/ip/user_agent` (`0013_signoff_attestation.sql`) |
| Least-privilege service credentials | 🟡 | Service-role key server-only; rotate + scope per deployment |
| Access / audit logging | 🟡 | App logs present; add centralised audit log for PHI access |

## Data minimisation & retention (DPDP §8(7))

| Requirement | Status | Where |
|-------------|--------|-------|
| Raw audio purged after 30 days | 🟡 | `audio_purged_at` column present; confirm purge job is scheduled |
| Notes retained per medical-records law | ⬜ | Cite the exact applicable rule (3–7 yrs) in the DPA |
| Audio size bounded | ✅ | Chunked upload + 50 MB bucket limit (`0012_storage_size_limit.sql`) |

## Processor / sub-processor obligations (DPDP §8(6))

| Requirement | Status | Where |
|-------------|--------|-------|
| **DPA signed with ASR vendor before real audio** (OQ-4) | ⬜ **BLOCKER** | `docs/legal/DPA_TEMPLATE.md` Annex A |
| DPA with LLM vendor (Gemini) | ⬜ | Annex A |
| DPA with hosting/storage (Supabase) | ⬜ | Annex A |
| Data residency recorded per sub-processor | ⬜ | Annex A; prefer India-resident ASR |
| Breach notification path (72h target) | ⬜ | Define runbook + contacts |

## Data-principal rights (DPDP §11–14)

| Requirement | Status | Where |
|-------------|--------|-------|
| Access / correction of records | 🟡 | Doctor can edit notes; add patient-facing access process |
| Erasure — full session delete | ✅ | `DELETE /api/sessions/:id` cascades all clinical data; consent_log retained (`0014`) |
| Erasure — patient delete | ✅ | `DELETE /api/patients/:id` cascades all their sessions |
| Erasure — audio only (keep note) | ✅ | `POST /api/sessions/:id/erase-audio` purges audio, stamps `audio_purged_at` |
| Grievance redressal / DPO contact | ⬜ | Publish grievance officer contact |

## Pre-pilot blockers (must clear before real patient data)

1. ⬜ **Sign the ASR-vendor DPA** (OQ-4). Until then keep `ASR_PROVIDER=mock` or
   self-hosted `faster_whisper`.
2. ⬜ Sign DPAs with LLM + hosting sub-processors; record residency.
3. ⬜ Publish the patient DPDP notice + grievance contact.
4. 🟡 Confirm the 30-day audio purge job runs on the deployment.
5. 🟡 Make MFA **mandatory** (not just available) for all doctor accounts before
   go-live — enroll every account during onboarding.

> Everything marked ✅ is enforced in code and covered by tests where the logic
> is pure (consent gate rule, sign-off validation). The ⬜ items are legal/
> process actions the codebase cannot complete on its own.
