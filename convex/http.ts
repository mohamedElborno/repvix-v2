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
    public?: boolean;
    via?: {
      source?: {
        from?: {
          address?: string;
        };
      };
    };
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

// Helper function for subdomain validation
function validateSubdomain(subdomain: unknown): string | null {
  if (!subdomain || typeof subdomain !== "string") {
    return "subdomain required";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(subdomain)) {
    return "Invalid subdomain format";
  }
  return null;
}

export const lemonWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = process.env.LEMON_WEBHOOK_SECRET ?? "";
  if (!secret) return new Response("Missing Secret", { status: 500 });

  // Rate limiting: Use IP address or webhook ID as identifier
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const webhookId = request.headers.get("x-webhook-id") || clientIp;

  const rateLimitAllowed = await ctx.runMutation(
    internal.webhookRateLimit.checkRateLimit,
    { identifier: webhookId }
  );

  if (!rateLimitAllowed) {
    // Log rate limit violation
    await ctx.runMutation(internal.zendeskAudit.logEvent, {
      eventType: "rate_limit_exceeded",
      action: "webhook_rate_limited",
      severity: "warning",
      ipAddress: clientIp,
      details: JSON.stringify({ identifier: webhookId }),
    });

    return new Response("Rate limit exceeded", { status: 429 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  const eventName = request.headers.get("x-event-name") ?? "";

  const rawBody = await request.text();

  const ok = await verifySignature(rawBody, signature, secret);
  if (!ok) {
    // Log invalid signature attempt
    await ctx.runMutation(internal.zendeskAudit.logEvent, {
      eventType: "webhook_processed",
      action: "invalid_signature",
      severity: "error",
      ipAddress: clientIp,
      details: JSON.stringify({ eventName, webhookId }),
    });
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Log webhook for debugging
  console.log(
    `[Lemon Webhook] Received event: ${eventName}, lemonId: ${payload?.data?.id}, custom_data:`,
    payload?.meta?.custom_data
  );

  await ctx.runMutation(internal.billing.ingestWebhook, {
    eventName,
    lemonId: payload?.data?.id ?? "unknown",
    payload,
  });

  // Process webhook immediately (don't wait for cron)
  try {
    await ctx.runMutation(internal.billing.handleEvent, {
      eventName,
      payload,
    });
    console.log(`[Lemon Webhook] Processed event ${eventName} immediately`);
  } catch (error) {
    console.error(
      `[Lemon Webhook] Failed to process event ${eventName} immediately:`,
      error
    );
    // Don't fail the webhook - cron will retry
  }

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

// ============================================
// /zendesk/remaining - Get remaining analysis count
// ============================================

http.route({
  path: "/zendesk/remaining",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/zendesk/remaining",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { subdomain: string; ticketId?: number };
    try {
      body = (await request.json()) as { subdomain: string; ticketId?: number };
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subdomain } = body;

    // Validation
    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: validationError,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zendeskAccountKey = subdomain;

    // Get or init usage
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

    // Calculate remaining
    const remaining = Math.max(0, usage.monthlyQuota - usage.usedThisMonth);

    // Return remaining count
    return new Response(
      JSON.stringify({
        ok: true,
        remaining,
        monthlyQuota: usage.monthlyQuota,
        usedThisMonth: usage.usedThisMonth,
        plan: usage.plan,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }),
});

// ============================================
// /zendesk/billing-portal - Get billing portal URL
// ============================================

// ============================================
// /zendesk/job-status - Get analysis job status
// ============================================

http.route({
  path: "/zendesk/job-status",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/zendesk/job-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { subdomain: string; ticketId: number };
    try {
      body = (await request.json()) as { subdomain: string; ticketId: number };
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subdomain, ticketId } = body;

    // Validation
    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: validationError,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zendeskAccountKey = subdomain;

    // Query job status
    const job = await ctx.runQuery(api.analysisJobs.byTicket, {
      zendeskAccountKey,
      ticketId,
    });

    if (!job) {
      return new Response(
        JSON.stringify({
          error: "job_not_found",
          message: "Analysis job not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        job: {
          status: job.status,
          progressMessage: job.progressMessage,
          result: job.result,
          error: job.error,
          startedAt: job.startedAt,
          updatedAt: job.updatedAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }),
});

http.route({
  path: "/zendesk/billing-portal",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/zendesk/billing-portal",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { subdomain: string };
    try {
      body = (await request.json()) as { subdomain: string };
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subdomain } = body;

    // Validation
    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: validationError,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call the action to get billing portal URL
    try {
      const result = await ctx.runAction(
        api.zendeskBilling.getZendeskBillingPortal,
        {
          zendeskAccountKey: subdomain,
        }
      );

      if (!result.ok) {
        return new Response(
          JSON.stringify({
            error: result.error,
            code: result.code,
            hint: result.hint,
          }),
          {
            status: result.code === "NO_ACTIVE_SUBSCRIPTION" ? 404 : 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          url: result.url,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          error: "portal_failed",
          message: error?.message ?? "Failed to get billing portal URL",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// ============================================
// /zendesk/analyze - Analyze ticket
// ============================================

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
    const validationError = validateSubdomain(subdomain);
    if (validationError) {
      return new Response(
        JSON.stringify({
          error: "invalid_payload",
          message: validationError,
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

    // 0️⃣ Check if there's already a running job for this ticket
    // Use the same endpoint logic as /zendesk/job-status
    const existingJob = await ctx.runQuery(api.analysisJobs.byTicket, {
      zendeskAccountKey,
      ticketId,
    });

    if (
      existingJob &&
      existingJob.status !== "done" &&
      existingJob.status !== "error"
    ) {
      // Check if job is not stale (older than 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (existingJob.updatedAt > tenMinutesAgo) {
        // Job already running, return immediately
        return new Response(
          JSON.stringify({
            ok: true,
            jobId: `${zendeskAccountKey}-${ticketId}`,
            message:
              "Analysis already in progress. Use polling to get progress updates.",
          }),
          {
            status: 202,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 0.5️⃣ Rate limiting per subdomain (max 10 analyses per minute)
    const rateLimitKey = `analyze:${zendeskAccountKey}`;
    const rateLimitAllowed = await ctx.runMutation(
      internal.webhookRateLimit.checkRateLimit,
      { identifier: rateLimitKey, maxRequests: 10 }
    );

    if (!rateLimitAllowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message:
            "Too many analysis requests. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Helper function to update job status
    const updateJob = async (
      status:
        | "preparing"
        | "analyzing"
        | "generating"
        | "finalizing"
        | "done"
        | "error",
      progressMessage: string,
      result?: any,
      error?: string
    ) => {
      try {
        // Use upsert instead of updateStatus to ensure job exists
        await ctx.runMutation(api.analysisJobs.upsert, {
          zendeskAccountKey,
          ticketId,
          status,
          progressMessage,
          result,
          error,
        });
      } catch (err) {
        // Log error but don't fail the entire request
        console.error(
          `[Job Update Error] ${zendeskAccountKey}-${ticketId}:`,
          err
        );
      }
    };

    const usage = await ctx.runMutation(internal.zendeskUsage.getOrInit, {
      zendeskAccountKey,
    });

    // Type guard: usage could be Id or object
    if (typeof usage === "string") {
      await updateJob(
        "error",
        "Failed to initialize usage",
        undefined,
        "usage_init_failed"
      );
      return new Response(JSON.stringify({ error: "usage_init_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3️⃣ Check quota
    if (usage.usedThisMonth >= usage.monthlyQuota) {
      // Create checkout URL directly using default variant
      const defaultVariantId = "1159109"; // Your Zendesk variant ID from zendeskPlan.ts

      try {
        const checkoutResult = await ctx.runAction(
          api.zendeskBilling.createZendeskCheckout,
          {
            zendeskAccountKey,
            variantId: defaultVariantId,
            userEmail: undefined,
          }
        );

        if (checkoutResult.ok && checkoutResult.url) {
          await updateJob(
            "error",
            "Quota exceeded",
            undefined,
            "quota_exceeded"
          );
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              upgradeUrl: checkoutResult.url, // Direct Lemon Squeezy checkout URL
            }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (error) {
        // If checkout creation fails, log but continue with fallback
        console.error(
          "Failed to create checkout URL for quota exceeded:",
          error
        );
      }

      // Fallback: return error if checkout creation fails
      await updateJob("error", "Quota exceeded", undefined, "quota_exceeded");
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          message: "Monthly analysis limit reached. Please upgrade your plan.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4️⃣ Schedule analysis to run asynchronously
    try {
      // Schedule the analysis to run immediately in the background
      await ctx.scheduler.runAfter(0, internal.analysisJobs.runAnalysis, {
        zendeskAccountKey,
        ticketId,
        subject,
        comments,
        requesterId: requesterId ?? undefined,
      });

      // 5️⃣ Return success immediately (client will get result via polling)
      return new Response(
        JSON.stringify({
          ok: true,
          jobId: `${zendeskAccountKey}-${ticketId}`,
          message: "Analysis started. Use polling to get progress updates.",
        }),
        {
          status: 202, // Accepted - processing asynchronously
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      await updateJob(
        "error",
        "Failed to start analysis",
        undefined,
        error?.message ?? "Failed to start analysis"
      );
      return new Response(
        JSON.stringify({
          error: "analysis_failed",
          message: error?.message ?? "Failed to start analysis",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
