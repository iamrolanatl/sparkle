# Decision Log (incl. Architecture Decision Records)

| Field | Value |
|---|---|
| Document ID | SPK-GOV-003 |
| Project | Sparkle — Student Success Platform |
| Version | 1.4 |
| Status | Draft — Baselined under CR-0001, pending sponsor sign-off |
| Document Owner | Rolan Chowdhury (PM) / Engineering Lead |
| Approver | Rolan Chowdhury (Sponsor / Project Manager) |
| Last Updated | 2026-10-21 |
| Source | Implementation Handoff §6, §8 |

> **Purpose.** Records key project and architectural decisions with context, rationale, and status. Seeded from handoff §6 (and §8 delivery approach).

> **Document control.** Changes to this document follow the process in [docs/README.md](../README.md#document-control-convention): an approved Change Request (CR) in the [CR Register](../00-governance/Change-Request-Register.md), a line in the [Change Log](../00-governance/Change-Log.md), and a version bump in the Revision History below — all in the same commit. Items marked **TBD (Rolan)** need sponsor input.

---

| ID | Date | Decision | Context / rationale | Alternatives | Decided by | Status |
|---|---|---|---|---|---|---|
| ADR-01 | Oct 2026 | Device-default credential storage (agent OS secure store) | Minimize central secret risk for school credentials | Central vault | Handoff v1.0 | Accepted |
| ADR-02 | Oct 2026 | Precomputed Today document (cached in KV) | Meet NFR-01/03; cacheability | On-demand query | Handoff v1.0 | Accepted |
| ADR-03 | Oct 2026 | Deterministic GPA engine; AI only explains | Correctness, trust | AI-computed GPA | Handoff v1.0 | Accepted |
| ADR-04 | Oct 2026 | Explicit confirmation required for any outbound communication | Safety, trust, policy compliance | Auto-send | Handoff v1.0 | Accepted |
| ADR-05 | Oct 2026 | Platform Profiles for multi-district expansion without code forks | NFR-07 | Per-district forks | Handoff v1.0 | Accepted |
| ADR-06 | Oct 2026 | Rive for Sparkle character | Full-body personality at low CPU | Lottie, video, 3D | Handoff v1.0 | Accepted |
| ADR-07 | Oct 2026 | Modular monolith first; extract ingestion/AI workers only when load triggers hit | Speed + simplicity; scale path | Microservices | Handoff v1.0 | Accepted |
| DEC-01 | Oct 2026 | Hybrid delivery: fixed-scope phases + 2-week sprints + go/no-go gates | Integration/compliance control + UX iteration | Pure Agile / Waterfall | Handoff v1.0 | Accepted |
| DEC-02 | 2026-10-21 | Project docs maintained as Markdown in `docs/` of `iamrolanatl/sparkle`, PMP process-group structure, CR-controlled | Sponsor direction | Word library | Rolan Chowdhury | Accepted |
| DEC-03 | 2026-10-21 | Use scoped API tokens / OAuth clients (not passwords) for Supabase, Cloudflare, Google Cloud, AI providers | Security, revocability, CI use | Shared passwords | Rolan Chowdhury | Proposed |
| DEC-04 | — | Age threshold for student-controlled sharing (13 vs 14) | Handoff recommends 13/14; migration uses placeholder 13 in `app_settings` (changeable without migration) | — | Rolan | Open |
| DEC-05 | 2026-10-21 | Google OAuth uses **one Web client** (GCP project `sparkle-app-2566`) for web and mobile through Supabase Auth; native iOS/Android OAuth clients only if native Google Sign-In is adopted later | Responsive web/PWA for MVP; one redirect via Supabase | Separate per-platform clients now | Rolan Chowdhury | Accepted |
| DEC-06 | 2026-10-21 | After the age threshold (DEC-04) the student can limit some guardian access. **Proposed default (pending Rolan's confirmation):** core school records (grades, attendance, assignments, schedule, teacher messages) always visible to guardians and not limitable; student may limit private daily notes, Sparkle/AI chat history, personal resources/links. Every limit is visible to guardians as "limited by student" — never hidden silently | Student autonomy vs. parental rights; FERPA gives parents rights to education records until 18 → legal review (R-10) | Full student control; no limits | Rolan Chowdhury (sponsor) | Accepted in principle; defaults pending confirmation |
| DEC-07 | 2026-10-21 | Helper access model (FR-16): guardians can always invite; students can invite at/over threshold, below it a guardian must approve; relationship enum + label; code_hash single-use 72 h, rate-limited; redemption only via SECURITY DEFINER `redeem_invitation`; teachers/tutors academic scopes only; many-to-many helpers; revocable by inviter/any guardian/student (≥ threshold); grant/revoke audited | Extended family & caregivers need visibility without becoming guardians | Guardian-only access | Rolan Chowdhury | Accepted |

| DEC-08 | 2026-10-21 | Public sales/support chat uses Workers AI Tier 1 (`@cf/meta/llama-3.1-8b-instruct`) via AI Gateway, grounded in a repo knowledge file, with kill switch + daily budget | Low cost, edge latency, consistent with handoff Tier 1 | Grok/Claude tiers | Rolan Chowdhury | Accepted |
| DEC-09 | 2026-10-21 | Scope addition CR-0004: NL tasks, weather, OCR, school mail vault — **amends handoff §1** ("adult/life-management out of scope"): features are admitted only in student-success form; personal/adult use stays out of scope | Sponsor request | Keep out of scope | Rolan Chowdhury | Accepted |
| DEC-20 | 2026-10-21 | Vault legal posture: not a FERPA school official (FERPA not directly applicable); full COPPA operator (no school-authorization reliance); GA SDPATA 'operator'; not HIPAA-covered; plan as if FTC HBNR applies to health docs; CCPA-ready; adopt Student Privacy Pledge commitments | 34 CFR 99.1/99.31; 16 CFR 312 (2025); O.C.G.A. 20-2-662/666; 16 CFR 318. Conservative reading = fewest surprises. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-21 | 2026-10-21 | VPC before any vault for a student; primary = payment-card verification (voided auth via processor), fallback = gov ID + face match with prompt image deletion; consent receipts stored; separate opt-in for third-party disclosure | 16 CFR 312.5(b)(2) enumerated methods; cheapest strong method. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-22 | 2026-10-21 | Minimization: reject/auto-redact SSNs, card & bank numbers, passwords; warn-and-confirm on full medical records, legal/custody docs; no non-school mail | COPPA 312.7/312.10; reduces breach impact & identity-theft exposure. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-23 | 2026-10-21 | Doc classes standard/academic/sensitive; sensitive (IEP, 504, health, discipline) = guardians only; helpers only via per-doc grant ≤ 30 days; teachers never by default; students cannot hide sensitive from guardians (DEC-06) | GA 20-2-666(a)(4) disclosure limits; least privilege. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-24 | 2026-10-21 | Encryption: TLS 1.2+; R2/Postgres AES-256 at rest; **mandatory** app-level envelope encryption (AES-256-GCM per-household DEK, KEK as Workers secret → KMS at 100k users) for sensitive class; annual rotation; crypto-shred on delete | ASVS 5.0 L2 V11; defense in depth vs. provider/insider exposure. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-25 | 2026-10-21 | Presigned GET URLs 5-min TTL for standard/academic only; sensitive streamed via authenticated Worker with 15-min step-up; no public bucket/CDN caching | Limit link leakage window. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-26 | 2026-10-21 | Append-only vault_access_log for every action; guardians see who viewed; 24-month retention; bulk-download and view-as alerts | CSF 2.0 DE.CM; accountability. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-27 | 2026-10-21 | No standing admin access; break-glass view-as (SSO+hardware MFA, ticket+reason, 30 min, banner, audited, family notified ≤ 24 h); sensitive excluded unless guardian consents | Insider-risk; FR-12. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-28 | 2026-10-21 | Retention: family-controlled delete; 7-day undo; primary purge ≤ 30 days; all copies incl. backups ≤ 60 days; delete after 26 months inactivity with notices; at 18 vault transfers to student (else 12-month read-only then purge); school request ≤ 45 days | COPPA 312.10 (no indefinite retention, written policy); GA 20-2-666(b)(2). See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-29 | 2026-10-21 | Breach: declare ≤ 24 h; notify families target ≤ 30 days, ceiling 60; FTC HBNR if health data (contemporaneous if ≥ 500); GA 10-1-912 + other states; CRAs if > 10k GA residents; vendors notify us ≤ 24 h | 16 CFR 318.4; O.C.G.A. 10-1-912. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-30 | 2026-10-21 | Subprocessors: Supabase, Cloudflare, Google (auth only), payment processor & ID vendor (VPC only), Sentry (scrubbed). No vault content to xAI/Anthropic without per-request opt-in, never sensitive. DPAs with no-training, ≤ 24 h breach notice, US processing, flow-down | COPPA 312.8(c); GA 20-2-666(a)(4)(F). See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-31 | 2026-10-21 | OCR: sensitive on-device only; others on-device first, Workers AI fallback; no third-party OCR APIs | Keep plaintext off third parties. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-32 | 2026-10-21 | No AI training/fine-tuning on vault content by Sparkle or vendors; zero-retention vendor settings | Pledge; parental trust. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-33 | 2026-10-21 | US data residency: Supabase US region, R2 ENAM hint; Workers AI only for non-sensitive | Residency expectation of US families/districts. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-34 | 2026-10-21 | Written Information Security Program on NIST CSF 2.0 + Privacy Framework; coordinator Rolan; annual risk assessment & review; ASVS 5.0 L2 for vault | COPPA 312.8(b) (mandatory since 2026-04-22); GA 20-2-666(b)(1). See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-35 | 2026-10-21 | Independent pen test before vault launch, Critical/High fixed; cross-tenant RLS tests in CI; annual retest | CSF ID.RA; launch assurance. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-36 | 2026-10-21 | Vault incident runbook + notification templates + annual tabletop | CSF RS/RC. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-37 | 2026-10-21 | vault_enabled stays off for real families until Launch Gate LG-01..14 met (incl. privacy counsel sign-off) | Plan §8. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-38 | 2026-10-21 | No ads, no sale/sharing, no profiling beyond family's own features; GPC honored | GA 20-2-666(a); CCPA 1798.120; Pledge. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-39 | 2026-10-21 | Vault requires Google sign-in + step-up re-auth for sensitive; guardians prompted to enable 2-Step Verification | ASVS V6/V7. See [Vault Plan](../02-planning/Vault-Compliance-and-Security-Plan.md) | — | Grok Bot under Rolan's delegated authority (CR-0005) | Accepted — counsel sign-off pending (LG-01) |
| DEC-40 | 2026-10-21 | Do not adopt or file bare 'SPARKLE' as the brand; move to a distinctive compound (e.g., 'Sparkle Student') with 'Sparkle' as the character name, pending counsel clearance | USPTO knock-out: crowded classes 9/41/42 incl. Viacom SPARKLER and pending identical SPARKLE. See [Trademark notes](../02-planning/Trademark-Clearance-Notes.md) | Keep bare Sparkle | Grok Bot per Rolan's approval (2026-10-21) | Proposed — final brand = SA-11 |
| DEC-41 | 2026-10-21 | Three environments: prod (exists), dev (separate Free-tier Supabase project), staging (Supabase Branching on Pro, else Workers staging env on dev DB) | Never test against real family data | Single project | Grok Bot per Rolan's approval (2026-10-21) | Accepted — dev blocked on SA-12 |
| DEC-42 | 2026-10-21 | Analytics: cookieless Cloudflare Web Analytics + first-party server events only; no third-party trackers, ad pixels, or session replay | COPPA/GA SDPATA/CCPA; DEC-38 | GA4/Mixpanel | Grok Bot per Rolan's approval (2026-10-21) | Accepted |
| DEC-43 | 2026-10-21 | Cost guardrails: Cloudflare budget + usage alerts to iamrolan@gmail.com, Supabase spend cap ON, xAI/Anthropic monthly spend limits ($25 each until G3) | Prevent bill shock | None | Grok Bot per Rolan's approval (2026-10-21) | Accepted — provider steps SA-13 |
| DEC-44 | 2026-10-21 | Repo security: Dependabot alerts + auto fixes on; recommend GitHub Pro for branch protection/push protection; gitleaks in CI as interim | Free plan limits | Public repo | Grok Bot per Rolan's approval (2026-10-21) | Accepted — Pro = SA-10 |
| DEC-45 | 2026-10-21 | Weekly status report automated Fridays ~4 PM ET to docs/04-monitoring-controlling/status/ and chat | Communications plan | Manual | Grok Bot per Rolan's approval (2026-10-21) | Accepted |

All ADRs are "Accepted" as inputs from the handoff and are ratified on approval of CR-0001.

---

## Approval / Sign-off

| Role | Name | Decision | Date | Signature / PR approval |
|---|---|---|---|---|
| Sponsor / Project Manager | Rolan Chowdhury | Pending | TBD (Rolan) | |
| Product Owner | TBD (Rolan) | Pending | | |
| Engineering Lead | TBD (Rolan) | Pending | | |

## Revision History

| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0001 | Re-created in PMBOK-aligned Markdown; reconciled with Implementation Handoff v1.0; gaps marked TBD. |
| 1.1 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0002 | Added DEC-05 (Google OAuth client), DEC-06 (guardian limits), DEC-07 (helper access). |
| 1.2 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0003, CR-0004 | Added DEC-08 (chat model), DEC-09 (CR-0004 scope amendment). |
| 1.3 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0005 | Added DEC-20..DEC-39 (vault compliance & security posture). |
| 1.4 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0006 | Added DEC-40..45. |
