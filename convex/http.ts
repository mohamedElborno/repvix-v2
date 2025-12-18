import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

type ZendeskAnalyzePayload = {
  subdomain: string;
  ticketId: number;
  subject: string;
  requesterId?: number;
  comments: {
    author_id: number;
    body: string;
    created_at: string;
  }[];
};

const http = httpRouter();
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

  await ctx.runMutation(internal.billing.ingestWebhook, {
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

http.route({
  path: "/zendesk/analyze",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/zendesk/analyze",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: ZendeskAnalyzePayload;
    try {
      body = (await request.json()) as ZendeskAnalyzePayload;
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subdomain, ticketId, subject, comments, requesterId } = body;

    // Validation
    if (!subdomain || typeof subdomain !== "string") {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: "subdomain required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!Array.isArray(comments) || comments.length === 0) {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: "comments array required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subject || typeof subject !== "string") {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: "subject required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zendeskAccountKey = subdomain;

    // 1️⃣ Get or init usage
    const usage = await ctx.runMutation(internal.zendeskUsage.getOrInit, {
      zendeskAccountKey,
    });

    // Type guard: usage could be Id or object
    if (typeof usage === "string") {
      return new Response(JSON.stringify({ error: "usage_init_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2️⃣ Check quota
    if (usage.usedThisMonth >= usage.monthlyQuota) {
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          upgradeUrl: `https://repvix.com/zendesk/upgrade?account=${zendeskAccountKey}`,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3️⃣ Run analysis (stateless, no DB writes)
    let analysis;
    try {
      analysis = await ctx.runAction(
        api.zendeskStatelessAnalysis.zendeskSidebarAnalyze,
        {
          subject,
          comments,
          requesterId: requesterId ?? undefined,
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          error: "analysis_failed",
          message: error?.message ?? "Analysis failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4️⃣ Increment usage (only after successful analysis)
    await ctx.runMutation(internal.zendeskUsage.increment, {
      zendeskAccountKey,
    });

    // 5️⃣ Return success
    return new Response(
      JSON.stringify({
        ok: true,
        analysis,
        remaining: usage.monthlyQuota - usage.usedThisMonth - 1,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
