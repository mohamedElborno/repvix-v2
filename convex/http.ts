import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// WebCrypto implementation for HMAC-SHA256
async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToUint8Array(signature),
    encoder.encode(rawBody)
  );

  return valid;
}

function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return arr;
}

export const lemonWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = process.env.LEMON_WEBHOOK_SECRET ?? "";
  if (!secret) return new Response("Missing Secret", { status: 500 });

  const signature = request.headers.get("x-signature") ?? "";
  const eventName = request.headers.get("x-event-name") ?? "";

  const rawBody = await request.text();

  const ok = await verifySignature(rawBody, signature, secret);
  if (!ok) return new Response("Invalid signature", { status: 401 });

  const payload = JSON.parse(rawBody);

  await ctx.runMutation(api.billing.ingestWebhook, {
    eventName,
    lemonId: payload?.data?.id ?? "unknown",
    payload,
  });

  return new Response("ok", { status: 200 });
});

http.route({
  path: "/lemon/webhook",
  method: "POST",
  handler: lemonWebhook,
});

export default http;
