export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

const encoder = new TextEncoder();

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

export async function expectedTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const signedPayload = Object.keys(params)
    .sort()
    .reduce((payload, key) => payload + key + params[key], url);
  const key = await crypto.subtle.importKey("raw", encoder.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return base64(await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload)));
}

export async function isValidTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  return constantTimeEqual(await expectedTwilioSignature(authToken, url, params), signature);
}

export async function sendTwilioSms(credentials: TwilioCredentials, to: string, body: string): Promise<void> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: credentials.fromNumber, Body: body }),
    },
  );
  if (!response.ok) throw new Error(`Twilio send failed with ${response.status}: ${await response.text()}`);
}
