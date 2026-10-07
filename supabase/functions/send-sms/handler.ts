import { Webhook } from "npm:standardwebhooks@1.0.0";
import { smsRoute } from "./routing.ts";

const kzMobile = /^77(?:0[0-25-8]|47|6[0-4]|7[15-8]|85)\d{7}$/;
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const fail = (status: number, message: string) => reply(status, { error: { http_code: status, message } });

export async function handleSms(request: Request): Promise<Response> {
  if (request.method !== "POST") return fail(405, "Method not allowed");
  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const login = Deno.env.get("KAZINFOTEH_LOGIN");
  const password = Deno.env.get("KAZINFOTEH_PASSWORD");
  if (!secret) return fail(503, "SMS delivery is not configured");
  if (Number(request.headers.get("content-length") ?? 0) > 32768) return fail(413, "Payload too large");
  const payload = await request.text();
  if (payload.length > 32768) return fail(413, "Payload too large");
  let event: { user?: { phone?: string }; sms?: { otp?: string; phone?: string } };
  try {
    const hookSecret = secret.replace(/^v1,whsec_/, "");
    event = new Webhook(hookSecret).verify(payload, Object.fromEntries(request.headers)) as typeof event;
  } catch {
    return fail(401, "Invalid webhook signature");
  }
  if (!login || !password) return fail(503, "SMS delivery is not configured");
  const providerBase = Deno.env.get("KAZINFOTEH_API_BASE_URL") ?? "https://so.kazinfoteh.org";
  if (!["https://isms.center", "https://so.kazinfoteh.org"].includes(providerBase)) return fail(503, "SMS API host is not configured");
  // Supabase supplies the OTP recipient in sms.phone. During a phone change,
  // user.phone still contains the old number (or is empty when adding one).
  const phone = (event.sms?.phone ?? event.user?.phone ?? "").replace(/^\+/, "");
  const otp = event.sms?.otp ?? "";
  if (!kzMobile.test(phone)) return fail(400, "Only Kazakhstan mobile numbers are supported");
  if (!/^\d{6}$/.test(otp)) return fail(400, "A six digit OTP is required");
  const route = smsRoute(phone);
  if ("error" in route) return fail(400, route.error);
  try {
    const credentials = new TextEncoder().encode(`${login}:${password}`);
    const authorization = `Basic ${btoa(String.fromCharCode(...credentials))}`;
    const response = await fetch(`${providerBase}/api/sms/send`, {
      method: "POST",
      headers: { "Authorization": authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ from: route.sender, to: phone, text: `Apex Media: ваш код ${otp}. Никому его не сообщайте.`, extra_id: request.headers.get("webhook-id") }),
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return fail(502, "SMS provider rejected the request");
    const result = await response.json();
    if (String(result.err) === "777") return fail(400, "APEX_SMS_BEELINE_DISABLED");
    if (result.err || !result.message_id || !["send", "sending", "sent", "delivered"].includes(result.status)) {
      return fail(502, "SMS provider did not accept the message");
    }
    // Never return or log the OTP, recipient, credentials or provider response.
    return reply(200, {});
  } catch {
    return fail(502, "SMS provider is temporarily unavailable");
  }
}
