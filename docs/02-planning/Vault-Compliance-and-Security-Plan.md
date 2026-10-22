# Mail Vault (FR-24) — Compliance & Security Plan

| Field | Value |
|---|---|
| Document ID | SPK-PLN-020 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Approved under delegated sponsor authority (CR-0005) — counsel sign-off pending before launch |
| Document Owner | Rolan Chowdhury (Sponsor / PM; designated Information Security Coordinator) |
| Approver | Rolan Chowdhury (decisions delegated to Grok Bot, 2026-10-21) |
| Last Updated | 2026-10-21 |
| Source | Primary-source research (§10); Rolan's delegation of "Blocker 2" |

> **Purpose.** Closes "Blocker 2" for FR-24 (Mail vault) and FR-23 (OCR): classifies Sparkle's legal posture, records the controls the vault must have, and defines the launch gate for the `vault_enabled` flag.
>
> **Not legal advice.** This is a research-based, deliberately conservative engineering/compliance posture. Final applicability calls are confirmed by privacy counsel before real family documents are stored (Launch Gate item LG-01).

> **Numbering note.** CR-0002..0004, DEC-05..07 and FR-16..24 are being added on the parallel `feat/phase0-foundation` branch. To avoid merge collisions this plan uses **DEC-20..DEC-39, NFR-20..NFR-34, R-20..R-25, WBS 6.8.x / 7.5** (vault rows were renumbered 6.7.x → 6.8.x on merge; 6.8.x is authoritative).

---

## 1. Scope
The vault stores, per student (and per household), scanned/uploaded school mail and documents: letters, flyers, permission slips, report cards, test-score reports, IEP/504 documents, school health forms (e.g., immunization certificates, medication authorizations), plus the OCR text and extracted fields. Files live in Cloudflare R2 bucket `sparkle-vault` (scans in `sparkle-scans`); metadata and OCR text live in Supabase Postgres under RLS (`can_view_student`). Users: guardians, students, and invited helpers (grandparents, tutors, teachers, etc.) with scoped read-only shares (FR-16 / DEC-07). After the age threshold the student may limit some guardian access, but core school records stay guardian-visible (DEC-06).

## 2. Legal posture (DEC-20)
| Regime | Finding | Posture we adopt |
|---|---|---|
| **FERPA** (20 U.S.C. 1232g; 34 CFR Part 99) | FERPA binds *educational agencies/institutions that receive ED funds* (34 CFR 99.1). A vendor gets FERPA duties through a school/district under the **school-official exception** (34 CFR 99.31(a)(1)(i)(B)): it must perform an institutional function, be under the school's **direct control**, and be named in the annual notice. Sparkle is chosen and used by **families**, has no district contract, and is under no school's control → **not a school official; FERPA does not directly govern Sparkle**. Records a parent obtains and uploads are the family's copies. | Treat every vault document as **education-record-grade** anyway: no re-disclosure, use only for the family's purpose. If Sparkle ever contracts with a district, a separate FERPA/DPA track (school-official terms) is required by CR. |
| **COPPA** (15 U.S.C. 6501; 16 CFR Part 312, amended 2025 — effective 2025-06-23, compliance 2026-04-22) | Sparkle is directed at K-12 families and has actual knowledge of under-13 users → **COPPA operator**. Amended rule requires a **written information security program** (312.8(b)), a **written data-retention policy** published in the notice and no indefinite retention (312.10), written assurances from service providers (312.8(c)), and separate consent for third-party disclosures. FTC **did not codify** a school-authorization exception in 2025 and Sparkle has no school relationship anyway. | **Full COPPA compliance; no reliance on school authorization.** Verifiable parental consent (VPC) before any child's vault use (DEC-21). WISP (DEC-34). Retention policy (DEC-28). |
| **HIPAA** (45 CFR 160/164) | Applies to covered entities (plans, clearinghouses, providers billing electronically) and their business associates. Sparkle is neither; school-held health records are also generally education records, not PHI. | **Not HIPAA-covered.** Do not claim "HIPAA compliant" in marketing. |
| **FTC Health Breach Notification Rule** (16 CFR Part 318, amended 2024-07-29) | Covers non-HIPAA vendors of personal health records drawing identifiable health info from multiple sources; a "breach" includes unauthorized disclosure; notice ≤ 60 calendar days; FTC notice contemporaneous if ≥ 500 people. A vault holding immunization/medical forms from parents and providers could be argued to fall in scope. | **Conservatively plan as if HBNR applies** to the sensitive-health class: breach clock ≤ 60 days, FTC notice path, and no non-consensual disclosure of health data (incl. to analytics/AI). |
| **Georgia Student Data Privacy, Accessibility, and Transparency Act** (O.C.G.A. 20-2-660 – 668) | "Operator" = non-school entity running an app *with actual knowledge it is used for K-12 school purposes and designed and marketed for K-12 school purposes* that collects student PII (20-2-662(8)). K-12 purposes include "collaboration between students, school personnel, or parents" — no district contract is required by the text. Duties (20-2-666): no targeted ads, no profiling except for K-12 purposes, no sale, no disclosure without consent except listed exceptions (service providers under contract), **reasonable security**, delete within 45 days on school request. | **Treat Sparkle as an "operator"** (conservative reading). Comply with every 20-2-666 duty; contracts with subprocessors mirror 20-2-666(a)(4)(F). |
| **CCPA/CPRA** (Cal. Civ. Code 1798.100 et seq.) and other state laws | CCPA applies above thresholds (e.g., > $26.625M revenue (2025 CPI-adjusted), 100k consumers, or 50% revenue from selling/sharing). Under-16 sale/share needs opt-in (1798.120(c)). Sparkle will likely be below thresholds at launch but targets 1M users. Many state comprehensive laws exempt or add duties for minors/health data. | **Design to CCPA now:** never sell or share (cross-context ads) any data, honor GPC, provide access/delete/correct, and treat vault health/IEP data as "sensitive personal information" (use limited to the service). Re-assess state-law footprint at each 100k-user milestone. |
| **Student Privacy Pledge** (FPF/SIIA, 2020) | Voluntary; enforceable by FTC once signed. | **Adopt its commitments now** (no sale, no targeted ads, no non-educational profiles, security, deletion, transparency); decide on formally signing after counsel review. |
| **Georgia breach law** (O.C.G.A. 10-1-910 – 912) | Notice "in the most expedient time possible and without unreasonable delay"; CRAs if > 10,000 GA residents; processors notify owners within 24 h. Technically limited to "information brokers"/"data collectors", but we follow it as best practice. | Follow 10-1-912 timelines regardless of definitional fit (DEC-29). |
| **Frameworks** | NIST CSF 2.0 (Govern/Identify/Protect/Detect/Respond/Recover), NIST Privacy Framework 1.0, OWASP ASVS 5.0 Level 2. | WISP structured on CSF 2.0 + Privacy Framework; vault verified to **ASVS 5.0 L2**. |

## 3. Decisions (summary — full entries in the [Decision Log](../00-governance/Decision-Log.md))
| ID | Decision |
|---|---|
| DEC-20 | Legal posture per §2 (not FERPA school official; full COPPA operator; GA SDPATA operator; not HIPAA; plan for FTC HBNR; CCPA-ready; Pledge commitments). |
| DEC-21 | **Consent.** Vault is a **guardian-owned** feature. Before a vault is created for any student, the guardian completes VPC: primary method = **payment-card verification** (small authorization, immediately voided, via the payment processor; card data never touches Sparkle) — an FTC-enumerated method (312.5(b)(2)); fallback = **government ID + live face match** via a vetted vendor with images deleted promptly after verification (2025 method). Consent receipt stored (who/when/method/version). Students 13–17 also see a plain-language notice; students under 13 cannot create or upload to a vault without an active guardian consent. Separate opt-in for any third-party disclosure. |
| DEC-22 | **Minimization.** The vault does **not** accept by default: SSNs, full payment-card or bank numbers, passwords/PINs, full medical records (clinical notes, lab results, diagnoses beyond school forms), custody/court orders, non-school personal mail. OCR + pattern detectors (SSN with area/group validity, Luhn card check, ABA routing+account, DOB+name combos, "diagnosis"/ICD keywords) run **before save**: SSN/card/bank numbers are **auto-redacted** in the image and OCR text (block if redaction fails); medical-record or legal-document detection **warns and requires the guardian to confirm "this is a school form"** or discard. |
| DEC-23 | **Classes & visibility.** `standard` (letters, flyers, permission slips, newsletters) · `academic` (report cards, progress reports, test scores, schedules) · `sensitive` (IEP, 504, evaluations, health/immunization/medication forms, discipline). Defaults: standard → guardians + student + helpers with "schoolwork" or "mail" scope; academic → guardians + student + helpers with "grades" scope (teachers/tutors academic scopes only); **sensitive → guardians only**, never shown to helpers (incl. teachers) unless a guardian makes an explicit **per-document, time-boxed (max 30 days)** grant; student sees own sensitive docs only when a guardian enables it (at/over threshold the student may request; guardian approves). Sensitive docs are "core school records" under DEC-06 → the student can never hide them from guardians. Class is suggested by OCR, confirmed by the uploader, and can only be **raised** (not lowered) by non-guardians. |
| DEC-24 | **Encryption.** TLS 1.2+ everywhere (HSTS). At rest: R2 (AES-256, provider-managed) and Supabase Postgres (AES-256 disk + encrypted backups). **Mandatory application-level envelope encryption for the `sensitive` class** (not optional): per-household data-encryption key (AES-256-GCM) wrapped by a key-encryption key held as a Workers secret (move to a managed KMS/HSM by 100k users); sensitive OCR text stored encrypted (searchable only via guardian-confirmed tags, not full-text). KEK rotated annually and on any suspected exposure; DEKs crypto-shredded on deletion. |
| DEC-25 | **Downloads.** Standard/academic: R2 presigned **GET, single object, TTL 5 minutes**, issued only after an RLS check, `Cache-Control: private, no-store`, `Content-Disposition` set. Sensitive: **no presigned URLs** — streamed and decrypted through an authenticated Worker; re-authentication within the last 15 minutes (step-up) required. No public bucket access, no `r2.dev` URL, no CDN caching of vault objects. |
| DEC-26 | **Audit.** Append-only `vault_access_log` (actor, role, student, doc, action: upload/view/download/share/unshare/classify/OCR/AI-use/delete/export, IP-hash, user agent, timestamp) — insert-only via SECURITY DEFINER function, no UPDATE/DELETE grants. Guardians can see "who viewed what" for their student. Log retention 24 months (minimal fields, no document content). Alerts on bulk download (> 20 docs/10 min) and on any admin view-as. |
| DEC-27 | **Admin access.** No standing admin access to vault content; service-role key never reaches clients. Support uses **break-glass "view-as"**: requires admin SSO + hardware MFA, ticket ID and reason, **30-minute** session, banner, full audit, family notified (email) within 24 h; **sensitive-class documents excluded** unless the guardian grants consent in-app for that session. Quarterly access review. |
| DEC-28 | **Retention & deletion.** Written retention policy (COPPA 312.10) published in the Privacy Policy. Guardians (and students ≥ 18) can delete any document or the whole vault in one action; 7-day "undo" then **hard purge of primary copies ≤ 30 days**; Postgres PITR/backups expire so that **all copies are gone ≤ 60 days** after the request (crypto-shredding of DEKs makes sensitive backups unreadable immediately). Account closure → same SLA. **Inactivity:** after 24 months with no guardian sign-in, notify at 24 and 25 months, delete at 26 months. **Student turns 18:** notices to guardians and student 60 and 14 days ahead; at 18, if the student has an account, control of that student's vault **transfers to the student** and guardians keep access only if the student grants a share; if no student account, vault is retained read-only for guardians for 12 months with notice, then purged unless the adult student claims it. On a school's/district's request for data under its control: delete ≤ 45 days (20-2-666(b)(2)). |
| DEC-29 | **Breach response.** Declare/triage within 24 h of detection; contain; counsel engaged immediately. Notify affected families "in the most expedient time possible" — internal target **≤ 30 days, hard ceiling 60 days** from discovery (HBNR 318.4). FTC HBNR notice contemporaneously if ≥ 500 people with health data affected (annual log if < 500). Georgia 10-1-912 and the breach laws of every affected resident's state; nationwide CRAs if > 10,000 GA residents. Subprocessors contractually notify Sparkle **≤ 24 h**. Law-enforcement delay honored when requested in writing. |
| DEC-30 | **Subprocessors.** Approved list: Supabase (DB/auth/storage of metadata, US region), Cloudflare (R2, Workers, KV, Queues, Workers AI), Google (sign-in only — no vault content), payment processor (VPC only), ID-verification vendor (fallback VPC only), Sentry (errors, PII-scrubbed). **xAI (Tier 2) and Anthropic (Tier 3) receive no vault content** unless the guardian gives explicit per-request opt-in, and **never sensitive-class content**. Each subprocessor needs a signed DPA with: use limited to providing the service, no training, security obligations, ≤ 24 h breach notice, US processing, flow-down (COPPA 312.8(c), GA 20-2-666(a)(4)(F)). Public subprocessor page; 30-day notice before adding one. |
| DEC-31 | **OCR location.** Sensitive class: **on-device OCR only** (browser/WebAssembly or native), so plaintext never leaves the device unencrypted except as ciphertext. Standard/academic: on-device first, fall back to **Cloudflare Workers AI** (no third-party OCR APIs). OCR output is reviewed by the uploader before extracted actions are saved (FR-23/24). |
| DEC-32 | **No AI training.** Vault content is never used to train or fine-tune any model (ours or a vendor's); vendor zero-retention/no-training settings required; no human review of vault content by vendors. Aggregate, de-identified product metrics only. |
| DEC-33 | **Data residency: United States.** Supabase project in a US region; R2 buckets with US location hint (ENAM — note: hint, not a contractual guarantee; see R-23); Workers AI used only for non-sensitive classes. Re-evaluate R2 jurisdictional controls if a US jurisdiction option becomes available. |
| DEC-34 | **Written Information Security Program (WISP).** Required by COPPA 312.8(b) and GA 20-2-666(b)(1). Coordinator: Rolan Chowdhury (until a security lead is staffed). Structure: NIST CSF 2.0 functions + NIST Privacy Framework; annual risk assessment, safeguards, testing/monitoring, annual review; vendor assessment; MFA for all staff/admin accounts; least-privilege tokens (DEC-03); secrets in GitHub encrypted secrets/Workers secrets; dependency and secret scanning in CI; ASVS 5.0 L2 checklist for vault code. |
| DEC-35 | **Testing.** Independent third-party penetration test (web app, APIs, RLS/tenant isolation, R2 access, view-as) **before** the vault launches to real families; all Critical/High fixed and retested; Mediums have a dated plan. Automated cross-tenant RLS tests in CI (one family can never read another's vault rows or objects). Repeat annually and after major changes. |
| DEC-36 | **Incident runbook.** Written vault incident runbook (§7) with roles, severity matrix, evidence preservation, kill switch (`vault_enabled=false` + revoke presigning), notification templates, and an annual tabletop exercise. |
| DEC-37 | **Launch gate** for `vault_enabled` on real families (§8). Until passed: vault only holds synthetic/sample documents, behind the flag, in non-production. |
| DEC-38 | **Commercial use.** No advertising, no sale or "sharing" of any vault data, no profiling except to deliver the family's own school features (GA 20-2-666(a); Pledge). Because nothing is sold/shared, the "Do Not Sell or Share" page states that and still honors GPC. |
| DEC-39 | **Authentication for vault.** Vault requires a signed-in Google account plus step-up re-auth for sensitive docs; guardians strongly encouraged (prompted) to enable 2-Step Verification on their Google account; sessions for sensitive views ≤ 15 min idle. |

## 4. Control → requirement mapping
| Control | NFR | Decision | Framework refs |
|---|---|---|---|
| VPC before vault | NFR-20 | DEC-21 | COPPA 312.5 |
| Minimization detectors / redaction | NFR-21 | DEC-22 | COPPA 312.7, 312.10; CSF PR.DS |
| Sensitivity classes & default visibility | NFR-22 | DEC-23 | GA 20-2-666(a)(4); ASVS V8 |
| Envelope encryption + TLS | NFR-23 | DEC-24 | ASVS V11/V12; CSF PR.DS-01/02 |
| Short-lived URLs / proxy | NFR-24 | DEC-25 | ASVS V8, V14 |
| Append-only audit | NFR-25 | DEC-26 | CSF DE.CM; ASVS V16 |
| Break-glass admin | NFR-26 | DEC-27 | CSF PR.AA |
| Retention/deletion SLAs | NFR-27 | DEC-28 | COPPA 312.10; GA 20-2-666(b)(2) |
| Breach response | NFR-28 | DEC-29, 36 | HBNR 318.4; O.C.G.A. 10-1-912; CSF RS |
| Subprocessor DPAs | NFR-29 | DEC-30 | COPPA 312.8(c); GA 20-2-666(a)(4)(F) |
| OCR location / no AI training | NFR-30 | DEC-31, 32 | Privacy Framework CT.DP |
| US residency | NFR-31 | DEC-33 | — |
| WISP | NFR-32 | DEC-34 | COPPA 312.8(b); CSF GV |
| Pen test + RLS tests | NFR-33 | DEC-35 | ASVS L2; CSF ID.RA |
| Vault auth & step-up | NFR-34 | DEC-39 | ASVS V6/V7 |

## 5. Data model additions (for the TDD)
- `vault_documents(id, student_id, household_id, class enum standard|academic|sensitive, title, source, received_on, r2_key, sha256, size, mime, ocr_status, ocr_text (null for sensitive), ocr_text_enc bytea (sensitive), tags, dek_id, created_by, created_at, deleted_at, purge_after)`
- `vault_grants(doc_id, grantee_profile_id, expires_at ≤ 30d, granted_by)` for per-document sensitive grants.
- `vault_access_log` (append-only, §DEC-26). `consents(guardian_id, student_id, kind, method, version, granted_at, revoked_at)`. `household_keys(household_id, wrapped_dek, kek_version, created_at, shredded_at)`.
- RLS: `can_view_student()` **AND** class rule (sensitive → guardian or valid `vault_grants` row). Writes via SECURITY DEFINER RPCs only.

## 6. Retention schedule (published in Privacy Policy)
| Data | Purpose | Retained | Deleted |
|---|---|---|---|
| Vault files + OCR text | Family's school-document storage | Until guardian/adult-student deletes, account closes, or 26 months inactivity | ≤ 30 days primary, ≤ 60 days all copies |
| Consent receipts | Prove VPC | Life of account + 3 years | then deleted |
| Access log | Security/accountability | 24 months | rolling |
| ID-verification images (fallback VPC) | Verify parent | Not retained by Sparkle; vendor deletes promptly after match | immediately after verification |
| Breach/incident records | Legal | 5 years | then deleted |

## 7. Incident runbook (summary)
1. **Detect & declare** (≤ 24 h): any suspected unauthorized access to vault data is Sev-1. Incident lead = Rolan (until staffed); Grok Bot assists with evidence collection.
2. **Contain:** flip `vault_enabled=false`; rotate R2 token + KEK if implicated; revoke sessions; preserve logs (export `vault_access_log`, Cloudflare/Supabase logs) to a sealed location.
3. **Assess** (counsel engaged): what data, which students, which states, health data? unencrypted? → determines HBNR, GA, other-state duties.
4. **Notify:** families (email + in-app) target ≤ 30 days, ceiling 60; FTC (HBNR) if applicable; state AGs where required; CRAs if > 10k GA residents; subprocessors per DPA.
5. **Recover & review:** fix, retest, post-incident review within 14 days, WISP update.
Templates and contact list live in `docs/06-operations/` (WBS 6.8.7).

## 8. Launch gate — `vault_enabled` for real families
All must be **true** and evidenced in the PR that flips the flag:
| # | Gate item | Evidence |
|---|---|---|
| LG-01 | **Privacy counsel sign-off** on this plan, Privacy Policy, Terms, retention policy, COPPA notice, and GA SDPATA/HBNR applicability (this plan is research, not legal advice) | Signed memo/email in `docs/` (redacted) |
| LG-02 | WISP written, approved, coordinator named; first risk assessment done | `docs/06-operations/WISP.md` |
| LG-03 | VPC flow live and tested (card verification + fallback), consent receipts stored | E2E tests |
| LG-04 | Minimization detectors + auto-redaction pass test corpus (≥ 95% recall on SSN/card patterns; 0 SSNs persisted in test set) | Test report |
| LG-05 | Envelope encryption for sensitive class + key rotation + crypto-shred tested | Tests + runbook |
| LG-06 | RLS/tenant-isolation suite green, incl. helpers, revoked shares, sensitive grants | CI |
| LG-07 | Third-party pen test complete; all Critical/High fixed and retested | Report summary |
| LG-08 | ASVS 5.0 L2 checklist for vault scope complete | Checklist |
| LG-09 | Signed DPAs with every subprocessor on the list; AI no-training/zero-retention confirmed | Contract index |
| LG-10 | Deletion/purge jobs verified end-to-end (incl. backups ≤ 60 days) | Test + ops evidence |
| LG-11 | Incident runbook + notification templates published; tabletop exercise held | Runbook + notes |
| LG-12 | Privacy Policy (with retention schedule & subprocessor list) and Terms live on the production domain | URL |
| LG-13 | Admin console has hardware MFA + break-glass view-as with notification | Tests |
| LG-14 | Cyber liability insurance in place (recommended) | Certificate |

## 9. Privacy Policy — points the vault section must include
1. What the vault is and what it stores (document classes); that it is optional.
2. Who controls it (guardians; the student at 18 per DEC-28) and who can see what by default (DEC-23), including that helpers never see sensitive documents without a per-document grant.
3. COPPA: we collect children's information only with verifiable parental consent; methods used; parents can review, delete, and refuse further collection; contact for requests.
4. What we will not accept (SSNs, card/bank numbers, full medical records) and that we auto-redact detected numbers.
5. OCR: where it runs (on-device / Cloudflare), that the user reviews extracted items.
6. AI: vault content is never used to train models; never sent to Tier 2/3 AI providers without explicit per-request opt-in; never for sensitive documents.
7. No sale, no "sharing" for cross-context advertising, no targeted ads, no profiling beyond the family's own school features; GPC honored.
8. Security summary: encryption in transit/at rest, extra encryption for sensitive documents, short-lived links, audit logs, no standing staff access, break-glass with notification.
9. **Retention policy** (§6 table) and deletion SLAs (30 / 60 days), inactivity deletion, turning-18 handling.
10. Subprocessor list (or link) and 30-day change notice; US data storage.
11. Breach notification commitment.
12. Rights: access, export (download all), correction, deletion — for guardians, students 13+ for their own content where applicable, and adult students; state-law rights (CCPA etc.).
13. Not a HIPAA service; not a school's official record system; we are not acting for the school (FERPA posture), and how we would respond to a school/district deletion request (≤ 45 days).
14. Contact, effective date, and how material changes are notified (advance notice + re-consent where COPPA requires).

## 10. Sources (fetched/checked 2026-10-21)
- 34 CFR 99.1 (applicability): https://www.law.cornell.edu/cfr/text/34/99.1
- 34 CFR 99.31 (school-official exception): https://www.law.cornell.edu/cfr/text/34/99.31
- ED SPPO, *Protecting Student Privacy While Using Online Educational Services*: https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Student%20Privacy%20and%20Online%20Educational%20Services%20(February%202014)_0.pdf
- ED SPPO, *Responsibilities of Third-Party Service Providers under FERPA*: https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf
- ED SPPO FAQ: https://studentprivacy.ed.gov/frequently-asked-questions
- COPPA Rule amendments, 90 FR (2025-04-22): https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule (full text: https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm)
- 16 CFR 312.8 (security program): https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.8
- 16 CFR 312.10 (retention): https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.10
- FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC Policy Statement on Education Technology and COPPA (2022): https://www.ftc.gov/system/files/ftc_gov/pdf/Policy%20Statement%20of%20the%20Federal%20Trade%20Commission%20on%20Education%20Technology.pdf
- HBNR final rule, 89 FR 47028 (2024-05-30): https://www.govinfo.gov/content/pkg/FR-2024-05-30/html/2024-10855.htm ; 16 CFR 318.4: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-318/section-318.4 ; FTC guidance: https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0
- O.C.G.A. 20-2-662 (definitions): https://law.justia.com/codes/georgia/title-20/chapter-2/article-15/section-20-2-662/
- O.C.G.A. 20-2-666 (operator duties): https://law.justia.com/codes/georgia/title-20/chapter-2/article-15/section-20-2-666/
- O.C.G.A. 10-1-912 (breach notice): https://law.justia.com/codes/georgia/title-10/chapter-1/article-34/section-10-1-912/
- Cal. Civ. Code 1798.120: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.120 ; CPPA thresholds: https://cppa.ca.gov/regulations/cpi_adjustment.html
- HHS, Joint FERPA/HIPAA guidance: https://www.hhs.gov/hipaa/for-professionals/faq/ferpa-and-hipaa/index.html
- Student Privacy Pledge: https://studentprivacypledge.org/privacy-pledge-2-0/
- NIST CSF 2.0 (CSWP 29): https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
- NIST Privacy Framework 1.0: https://www.nist.gov/privacy-framework
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release
- Cloudflare R2 data location: https://developers.cloudflare.com/r2/reference/data-location/

---

## Approval / Sign-off
| Role | Name | Decision | Date | Signature / PR approval |
|---|---|---|---|---|
| Sponsor / Project Manager | Rolan Chowdhury (delegated to Grok Bot) | Approved — delegated authority | 2026-10-21 | PR |
| Privacy counsel | TBD (Rolan) | Pending — LG-01 | | |

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Initial plan; DEC-20..39; NFR-20..34; launch gate. |
