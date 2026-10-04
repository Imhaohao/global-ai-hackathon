import { VerificationError, type VerificationProvider } from "./phoneAuth.ts";

type VerifyCredentials = { accountSid: string; authToken: string; serviceSid: string };
type VerifyResult = { status?: string; valid?: boolean; to?: string; sid?: string; service_sid?: string };

function providerFailure(status: number, code: unknown, checking: boolean): VerificationError {
  if (status === 429 || code === 60203 || code === 60202) return new VerificationError("rate_limited");
  if (checking && status === 404) return new VerificationError("invalid_code");
  if (code === 60200 || code === 21211 || code === 21614) return new VerificationError("invalid_phone");
  return new VerificationError("unavailable");
}

export function createTwilioVerify(credentials: VerifyCredentials, fetcher: typeof fetch = fetch): VerificationProvider | null {
  if (!/^AC[\da-f]{32}$/i.test(credentials.accountSid) || !/^VA[\da-f]{32}$/i.test(credentials.serviceSid) || !credentials.authToken) return null;
  const baseUrl = `https://verify.twilio.com/v2/Services/${credentials.serviceSid}`;
  const post = async (path: string, params: Record<string, string>, checking: boolean): Promise<VerifyResult> => {
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new VerificationError("unavailable");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) throw providerFailure(response.status, result?.code, checking);
    if (!result || typeof result !== "object") throw new VerificationError("unavailable");
    return result;
  };
  return {
    send: async (phone, language) => {
      const result = await post("Verifications", { To: phone, Channel: "sms", Locale: language }, false);
      if (result.status !== "pending" || result.to !== phone) throw new VerificationError("unavailable");
    },
    check: async (phone, code) => {
      const result = await post("VerificationCheck", { To: phone, Code: code }, true);
      if (result.status !== "approved" || result.valid !== true) return null;
      if (result.to !== phone || result.service_sid !== credentials.serviceSid || !/^VE[\da-f]{32}$/i.test(result.sid ?? "")) {
        throw new VerificationError("unavailable");
      }
      return result.sid!;
    },
  };
}
