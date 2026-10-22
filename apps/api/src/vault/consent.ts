/**
 * Verifiable parental consent adapter (DEC-21). Real vendors (card verification, ID + face match)
 * wait on sponsor approval (Sponsor-Action-Items); only the dev stub exists and it refuses production.
 */
type ConsentMethod = "card_verification" | "id_face_match" | "sample_only";

export interface ConsentVerification {
  ok: boolean;
  method: ConsentMethod;
  /** Vendor transaction reference only — never card or ID data. */
  ref?: string;
  reason?: string;
}

export interface ConsentVerifier {
  readonly method: ConsentMethod;
  verify(input: { guardianId: string; studentId: string; token?: string }): Promise<ConsentVerification>;
}

export class DevStubVerifier implements ConsentVerifier {
  readonly method = "sample_only" as const;
  constructor(private appEnv: string | undefined) {}
  async verify(input: { guardianId: string; studentId: string }): Promise<ConsentVerification> {
    if (this.appEnv === "production") return { ok: false, method: this.method, reason: "stub_disabled_in_production" };
    return { ok: true, method: this.method, ref: `dev-stub:${input.guardianId.slice(0, 8)}:${Date.now()}` };
  }
}

export function consentVerifier(env: { APP_ENV?: string }): ConsentVerifier {
  // When a vendor is approved: return new CardVerifier(env) here, selected by env config.
  return new DevStubVerifier(env.APP_ENV);
}
