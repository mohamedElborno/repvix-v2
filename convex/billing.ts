import { v } from "convex/values";
import {
  action,
  query,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { mapVariantToPlan, limitsForTier } from "./billingPlan";
import { assertOrgRole } from "./lib/guard";
import { requireOrgMembership } from "./auth";
import { isZendeskVariant } from "./zendeskPlan";

// === Helper Functions ======================================================

function mapLemonStatus(
  s: string
): "none" | "trial" | "active" | "past_due" | "cancelled" | "expired" {
  if (s === "on_trial") return "trial";
  if (s === "active") return "active";
  if (s === "past_due") return "past_due";
  if (s === "cancelled") return "cancelled";
  if (s === "expired") return "expired";
  return "none";
}

function ts(input?: string | null): number | undefined {
  if (!input) return undefined;
  const n = Date.parse(input);
  return Number.isFinite(n) ? n : undefined;
}

function cents(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

function getTier(variantId?: string | null) {
  if (!variantId) return null;
  try {
    return mapVariantToPlan(variantId).tier as
      | "basic"
      | "starter"
      | "pro"
      | "business";
  } catch {
    return null;
  }
}

function isUpgrade(
  currentTier: "basic" | "starter" | "pro" | "business" | null,
  newTier: "basic" | "starter" | "pro" | "business" | null
) {
  if (!currentTier && newTier) return true;
  if (!currentTier || !newTier) return false;

  const order = ["basic", "starter", "pro", "business"] as const;
  const idx = (x: "basic" | "starter" | "pro" | "business") => order.indexOf(x);

  return idx(newTier) > idx(currentTier);
}

async function resolveOrganizationId(ctx: any, ref?: string) {
  if (!ref) {
    console.warn("resolveOrganizationId: ref is empty");
    return undefined;
  }

  // Try as Convex ID first
  try {
    const maybe = await ctx.db.get(ref as Id<"organizations">);
    if (maybe?._id) {
      return maybe._id;
    }
  } catch (error) {
    // Not a valid Convex ID, try as Clerk ID
  }

  // Try as Clerk Org ID
  const viaClerk = await ctx.db
    .query("organizations")
    .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", ref))
    .first();

  if (viaClerk?._id) {
    return viaClerk._id;
  }

  return undefined;
}

/* --------------------------------------------------------------
 * Queries
 * -------------------------------------------------------------- */

export const getViewerRole = query({
  args: { organizationId: v.id("organizations"), clerkUserId: v.string() },
  handler: async (ctx, { organizationId, clerkUserId }) => {
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("clerkUserId"), clerkUserId))
      .first();

    return member?.role ?? null;
  },
});

export const getCurrentPlan = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org)
      return {
        planTier: null,
        billingStatus: null,
        activeSubscriptionId: null,
      };

    return {
      planTier: org.planTier ?? null,
      billingStatus: org.billingStatus ?? null,
      activeSubscriptionId: org.activeSubscriptionId ?? null,
    };
  },
});

/**
 * Check if the org already has an active subscription for a given variant.
 */
export const hasActiveSubscriptionForVariant = query({
  args: {
    organizationId: v.id("organizations"),
    variantId: v.string(),
  },
  handler: async (ctx, { organizationId, variantId }) => {
    await requireOrgMembership(ctx, organizationId);

    const activeStatuses = ["active", "on_trial"];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect();

    const hasActive = subscriptions.some(
      (sub) =>
        sub.variantId === variantId &&
        activeStatuses.includes(sub.status.toLowerCase())
    );

    return hasActive;
  },
});

/**
 * Get the current active subscription for an organization.
 */
export const getActiveSubscription = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    await requireOrgMembership(ctx, organizationId);
    const activeStatuses = ["active", "on_trial"];

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect();

    const activeSub = subscriptions.find((sub) =>
      activeStatuses.includes(sub.status.toLowerCase())
    );

    if (!activeSub) return null;

    return {
      lemonSubscriptionId: activeSub.lemonSubscriptionId,
      variantId: activeSub.variantId ?? null,
      productId: activeSub.productId ?? null,
      status: activeSub.status,
    };
  },
});

export const getBillingPortalData = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgMembership(ctx, organizationId);
    const org = await ctx.db.get(organizationId);
    if (!org) return { plan: null, limits: null };

    const plan = org.planTier ?? null;
    let remainingAnalyses: number | "unlimited" | undefined = undefined;

    if (org.planTier) {
      const lim = limitsForTier(org.planTier);

      if (lim.dailyAnalyses === "unlimited") {
        remainingAnalyses = "unlimited";
      } else {
        const now = Date.now();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const startMs = start.getTime();

        const analyses = await ctx.db
          .query("chatAnalyses")
          .withIndex("by_org_createdAt", (q: any) =>
            q.eq("organizationId", organizationId).gte("createdAt", startMs)
          )
          .collect();

        remainingAnalyses = Math.max(0, lim.dailyAnalyses - analyses.length);
      }
    }

    const limits = org.limits
      ? {
          remaining: remainingAnalyses,
          employees: org.limits.members,
          integrations: org.limits.integrations?.length ?? 0,
        }
      : null;

    return { plan, limits };
  },
});

/* --------------------------------------------------------------
 * Insert Webhook Event
 * -------------------------------------------------------------- */

export const ingestWebhook = internalMutation({
  args: { eventName: v.string(), lemonId: v.string(), payload: v.any() },
  handler: async (ctx, args) => {
    const webhookId = args.payload?.meta?.webhook_id as string | undefined;
    const dedupeKey = webhookId ?? `${args.eventName}:${args.lemonId}`;

    const dupByWebhook = webhookId
      ? await ctx.db
          .query("webhookEvents")
          .withIndex("by_webhookId", (q: any) => q.eq("webhookId", webhookId))
          .first()
      : null;

    const dupByLemon = await ctx.db
      .query("webhookEvents")
      .withIndex("by_lemonId", (q: any) => q.eq("lemonId", dedupeKey))
      .first();

    if (dupByWebhook || dupByLemon) {
      return;
    }

    await ctx.db.insert("webhookEvents", {
      eventName: args.eventName,
      lemonId: dedupeKey,
      webhookId,
      payload: args.payload,
      receivedAt: Date.now(),
      processed: false,
    });
  },
});

/* --------------------------------------------------------------
 * Main Billing Webhook Processor
 * -------------------------------------------------------------- */

export const handleEvent = internalMutation({
  args: { eventName: v.string(), payload: v.any() },
  handler: async (ctx, { eventName, payload }) => {
    const data = payload?.data ?? {};
    const attr = data?.attributes ?? {};
    const lemonId = String(data?.id ?? "");

    // Extract org + clerkUser from webhook custom data
    const custom = payload?.meta?.custom_data ?? {};
    const orgRef = custom?.organizationId as string | undefined;
    const clerkUserId = custom?.clerkUserId as string | undefined;

    // Log custom data for debugging (especially for Zendesk)
    // Note: Detailed logging moved to audit logs for better tracking

    const organizationId = await resolveOrganizationId(ctx, orgRef);

    // Log for debugging
    if (!organizationId && orgRef) {
      console.error(
        `Failed to resolve organizationId for ref: ${orgRef}, event: ${eventName}, lemonId: ${lemonId}`
      );
    }

    /* -------------------------
     * ORDER CREATED
     * ------------------------- */
    if (eventName === "order_created") {
      if (organizationId && attr?.customer_id) {
        const existing = await ctx.db
          .query("billingCustomers")
          .withIndex("by_org", (q: any) =>
            q.eq("organizationId", organizationId)
          )
          .first();

        const email = attr?.user_email ?? undefined;

        if (existing) {
          await ctx.db.patch(existing._id, {
            lemonCustomerId: String(attr.customer_id),
            email: email ?? existing.email,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("billingCustomers", {
            organizationId,
            clerkUserId: clerkUserId ?? "",
            lemonCustomerId: String(attr.customer_id),
            email,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    /* -------------------------
     * ORDER REFUNDED
     * ------------------------- */
    if (eventName === "order_refunded" && organizationId) {
      await ctx.db.insert("invoices", {
        organizationId,
        lemonInvoiceId: lemonId,
        subscriptionId: undefined,
        amountCents: -cents(attr?.total ?? 0),
        currency: attr?.currency ?? "USD",
        status: "refunded",
        issuedAt: ts(attr?.created_at) ?? Date.now(),
        paidAt: ts(attr?.refunded_at),
        meta: attr,
        createdAt: Date.now(),
      });
    }

    /* -------------------------
     * SUBSCRIPTIONS
     * ------------------------- */
    // Subscription lifecycle events (create/update/cancel) — exclude payment events
    const isSubscriptionLifecycle =
      eventName.startsWith("subscription_") &&
      !eventName.startsWith("subscription_payment_");

    if (isSubscriptionLifecycle) {
      const subExternal = String(data?.id ?? "");
      const statusRaw = String(attr?.status ?? "none");
      const status = mapLemonStatus(statusRaw);

      const variantId =
        attr?.variant_id ??
        data?.attributes?.first_subscription_item?.variant_id ??
        undefined;

      const renewsAt = ts(attr?.renews_at);
      const canceledAt = ts(attr?.canceled_at);
      const trialEndsAt = ts(attr?.trial_ends_at);

      const subscriptionUpdate = {
        status,
        productId: attr?.product_id ? String(attr.product_id) : undefined,
        variantId: variantId ? String(variantId) : undefined,
        planName: attr?.variant_name ?? attr?.product_name,
        currentPeriodEnd: renewsAt,
        renewsAt,
        canceledAt,
        trialEndsAt,
        updatedAt: Date.now(),

        // Important URLs
        customerPortal: attr?.urls?.customer_portal || undefined,
        updatePaymentMethodUrl: attr?.urls?.update_payment_method || undefined,
        updateSubscriptionUrl:
          attr?.urls?.customer_portal_update_subscription || undefined,
      };

      // Check if this is a Zendesk-only checkout BEFORE checking organizationId
      const checkoutType = custom?.checkout_type as string | undefined;
      const zendeskSubdomain = custom?.zendesk_subdomain as string | undefined;
      const isZendeskOnlyCheckout =
        checkoutType === "zendesk" ||
        (typeof zendeskSubdomain === "string" &&
          zendeskSubdomain.length > 0 &&
          !organizationId);

      // If this is a Zendesk-only checkout, handle it separately (below)
      // Otherwise, require organizationId
      if (!isZendeskOnlyCheckout && !organizationId) {
        console.error(
          `Cannot process subscription ${subExternal}: organizationId is null. orgRef: ${orgRef}, event: ${eventName}`
        );
        return;
      }

      // Handle Zendesk plan upgrade FIRST (if subscription is active and created/updated)
      // Note: isZendeskOnlyCheckout is already defined above
      // Zendesk subscriptions should NOT be saved in the "subscriptions" table

      if (
        isZendeskOnlyCheckout &&
        (eventName === "subscription_created" ||
          eventName === "subscription_updated") &&
        status === "active"
      ) {
        if (
          typeof zendeskSubdomain === "string" &&
          zendeskSubdomain.length > 0
        ) {
          // Security: Validate zendesk_subdomain format (alphanumeric, hyphens, underscores only)
          const subdomainRegex = /^[a-z0-9_-]+$/i;
          if (!subdomainRegex.test(zendeskSubdomain)) {
            console.error(
              `[Zendesk Webhook] Invalid zendesk_subdomain format: ${zendeskSubdomain}`
            );
            // Log security event
            await ctx.runMutation(internal.zendeskAudit.logEvent, {
              zendeskAccountKey: zendeskSubdomain,
              lemonSubscriptionId: subExternal,
              eventType: "invalid_subdomain",
              action: "rejected_invalid_subdomain",
              severity: "error",
              details: JSON.stringify({
                subdomain: zendeskSubdomain,
                subscriptionId: subExternal,
              }),
            });
            return; // Reject invalid subdomain format
          }

          try {
            const variantId = subscriptionUpdate.variantId;

            // Security: Verify that this is actually a Zendesk variant
            if (!variantId || !isZendeskVariant(variantId)) {
              console.error(
                `[Zendesk Webhook] Invalid or non-Zendesk variant: ${variantId} for subdomain: ${zendeskSubdomain}`
              );
              // Log security event
              await ctx.runMutation(internal.zendeskAudit.logEvent, {
                zendeskAccountKey: zendeskSubdomain,
                lemonSubscriptionId: subExternal,
                eventType: "invalid_variant",
                action: "invalid_variant_id",
                severity: "warning",
                details: JSON.stringify({
                  variantId,
                  subdomain: zendeskSubdomain,
                  subscriptionId: subExternal,
                }),
              });
              // Still save subscription but don't upgrade plan
            }

            // Processing logged via audit logs

            // Always save subscription details first (even if variant check fails)
            // This ensures we have a record of the subscription
            try {
              const subscriptionId = await ctx.runMutation(
                internal.zendeskSubscriptions.getOrCreate,
                {
                  zendeskAccountKey: zendeskSubdomain,
                  lemonSubscriptionId: subExternal,
                  productId: subscriptionUpdate.productId,
                  variantId: subscriptionUpdate.variantId ?? undefined,
                  status: subscriptionUpdate.status,
                  planName: subscriptionUpdate.planName,
                  customerPortal: subscriptionUpdate.customerPortal,
                  updatePaymentMethodUrl:
                    subscriptionUpdate.updatePaymentMethodUrl,
                  updateSubscriptionUrl:
                    subscriptionUpdate.updateSubscriptionUrl,
                  currentPeriodEnd: subscriptionUpdate.currentPeriodEnd,
                  renewsAt: subscriptionUpdate.renewsAt,
                  canceledAt: subscriptionUpdate.canceledAt,
                  trialEndsAt: subscriptionUpdate.trialEndsAt,
                }
              );

              // Audit log: subscription created/updated
              await ctx.runMutation(internal.zendeskAudit.logEvent, {
                zendeskAccountKey: zendeskSubdomain,
                lemonSubscriptionId: subExternal,
                eventType:
                  eventName === "subscription_created"
                    ? "subscription_created"
                    : "subscription_updated",
                action: "subscription_saved",
                severity: "info",
                details: JSON.stringify({
                  subscriptionId,
                  variantId: subscriptionUpdate.variantId,
                  status: subscriptionUpdate.status,
                  planName: subscriptionUpdate.planName,
                }),
              });
            } catch (subError) {
              console.error(
                `[Zendesk Webhook] Failed to save subscription for ${zendeskSubdomain}:`,
                subError
              );
            }

            // Only update usage plan if this is a Zendesk variant
            if (variantId && isZendeskVariant(variantId)) {
              try {
                // First, ensure usage record exists
                await ctx.runMutation(internal.zendeskUsage.getOrInit, {
                  zendeskAccountKey: zendeskSubdomain,
                });

                // Update usage plan
                await ctx.runMutation(internal.zendeskUsage.setPaidPlan, {
                  zendeskAccountKey: zendeskSubdomain,
                });

                // Audit log: plan upgraded
                await ctx.runMutation(internal.zendeskAudit.logEvent, {
                  zendeskAccountKey: zendeskSubdomain,
                  lemonSubscriptionId: subExternal,
                  eventType: "plan_upgraded",
                  action: "upgrade_to_pro",
                  severity: "info",
                  details: JSON.stringify({
                    variantId,
                    planName: subscriptionUpdate.planName,
                  }),
                });
              } catch (usageError) {
                console.error(
                  `[Zendesk Webhook] Failed to update usage plan for ${zendeskSubdomain}:`,
                  usageError
                );
                // Don't throw - subscription is already saved
              }
            } else {
              console.warn(
                `[Zendesk Webhook] Variant ${variantId} is not a Zendesk variant (not in ZENDESK_LEMON_VARIANT_TO_TIER). Subscription saved but plan not upgraded.`
              );
            }
          } catch (error) {
            // Log but don't fail the webhook processing
            console.error(
              `[Zendesk Webhook] Failed to upgrade Zendesk plan for ${zendeskSubdomain}:`,
              error
            );
          }
        } else {
          console.warn(
            `[Zendesk Webhook] Missing or invalid zendeskSubdomain: ${zendeskSubdomain}`
          );
        }
        // For Zendesk-only checkouts, don't process organization updates
        // Return early to skip organization billing updates
        return;
      }

      // Only process organization subscriptions if this is NOT a Zendesk-only checkout
      // Zendesk subscriptions are handled above and return early
      if (!organizationId) {
        console.error(
          `Cannot process subscription ${subExternal}: organizationId is null and not a Zendesk checkout. orgRef: ${orgRef}, event: ${eventName}`
        );
        return;
      }

      // Handle regular organization subscriptions
      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_sub", (q: any) =>
          q.eq("lemonSubscriptionId", subExternal)
        )
        .first();

      let subscriptionId: Id<"subscriptions">;

      if (existing) {
        await ctx.db.patch(existing._id, subscriptionUpdate);
        subscriptionId = existing._id;
      } else {
        subscriptionId = await ctx.db.insert("subscriptions", {
          organizationId,
          lemonSubscriptionId: subExternal,
          createdAt: Date.now(),
          ...subscriptionUpdate,
        });
      }

      // Handle regular Zendesk upgrade (when organizationId exists and zendesk_subdomain is present)
      // This is for main platform subscriptions that include Zendesk
      if (
        organizationId &&
        (eventName === "subscription_created" ||
          eventName === "subscription_updated") &&
        status === "active"
      ) {
        if (
          typeof zendeskSubdomain === "string" &&
          zendeskSubdomain.length > 0
        ) {
          try {
            await ctx.runMutation(internal.zendeskUsage.setPaidPlan, {
              zendeskAccountKey: zendeskSubdomain,
            });
          } catch (error) {
            // Log but don't fail the webhook processing
            console.error(
              `Failed to upgrade Zendesk plan for ${zendeskSubdomain}:`,
              error
            );
          }
        }
      }

      // Update org billing info
      const tier = getTier(subscriptionUpdate.variantId ?? null);
      const isCancelled = status === "cancelled" || status === "expired";

      if (tier) {
        const { limits } = mapVariantToPlan(subscriptionUpdate.variantId);

        const orgUpdate: any = {
          billingStatus: status,
          activeSubscriptionId: isCancelled ? undefined : subscriptionId,
          renewsAt,
        };

        if (!isCancelled) {
          orgUpdate.planTier = tier;
          orgUpdate.limits = {
            members:
              limits.members === "unlimited" ? undefined : limits.members,
            dailyAnalyses:
              limits.dailyAnalyses === "unlimited"
                ? undefined
                : limits.dailyAnalyses,
            exports: limits.exports,
            integrations: limits.integrations,
            features: limits.features,
            support: limits.support,
          };
        } else {
          orgUpdate.planTier = undefined;
          orgUpdate.limits = undefined;
        }

        await ctx.db.patch(organizationId, orgUpdate);
      } else if (isCancelled) {
        await ctx.db.patch(organizationId, {
          billingStatus: status,
          activeSubscriptionId: undefined,
          planTier: undefined,
          limits: undefined,
        });
      } else {
        console.warn(
          `No tier found for variantId ${subscriptionUpdate.variantId}, subscription saved but org not updated`
        );
      }
    }

    /* -------------------------
     * SUBSCRIPTION PAYMENT
     * ------------------------- */
    if (eventName.startsWith("subscription_payment_") && organizationId) {
      const isRefund = eventName === "subscription_payment_refunded";
      const isFailed = eventName === "subscription_payment_failed";

      const invoiceStatus = isRefund
        ? "refunded"
        : isFailed
          ? "payment_failed"
          : "paid";

      let subscriptionRef: Id<"subscriptions"> | undefined = undefined;

      if (attr?.subscription_id) {
        const subId = String(attr.subscription_id);

        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_sub", (q: any) => q.eq("lemonSubscriptionId", subId))
          .first();

        if (existing) {
          subscriptionRef = existing._id;
          const newRenew = ts(attr?.renews_at) ?? existing.renewsAt;

          await ctx.db.patch(existing._id, {
            status: "active",
            renewsAt: newRenew,
            currentPeriodEnd: newRenew,
            updatedAt: Date.now(),
          });

          const tier = getTier(existing.variantId);
          if (tier) {
            const { limits } = mapVariantToPlan(existing.variantId!);

            await ctx.db.patch(existing.organizationId, {
              billingStatus: "active",
              planTier: tier,
              renewsAt: newRenew,
              limits: {
                members:
                  limits.members === "unlimited" ? undefined : limits.members,
                dailyAnalyses:
                  limits.dailyAnalyses === "unlimited"
                    ? undefined
                    : limits.dailyAnalyses,
                exports: limits.exports,
                integrations: limits.integrations,
                features: limits.features,
                support: limits.support,
              },
            });
          }
        }
      }

      await ctx.db.insert("invoices", {
        organizationId,
        lemonInvoiceId: lemonId,
        subscriptionId: subscriptionRef,
        amountCents: cents(attr?.total ?? 0) * (isRefund ? -1 : 1),
        currency: attr?.currency ?? "USD",
        status: invoiceStatus,
        issuedAt: ts(attr?.created_at) ?? Date.now(),
        paidAt: ts(attr?.paid_at),
        meta: attr,
        createdAt: Date.now(),
      });
    }

    /* -------------------------
     * Mark Webhook Processed
     * ------------------------- */
    const webhookId = payload?.meta?.webhook_id as string | undefined;
    const ev =
      (webhookId &&
        (await ctx.db
          .query("webhookEvents")
          .withIndex("by_webhookId", (q: any) => q.eq("webhookId", webhookId))
          .first())) ||
      (await ctx.db
        .query("webhookEvents")
        .withIndex("by_lemonId", (q: any) =>
          q.eq("lemonId", webhookId ? `${eventName}:${lemonId}` : lemonId)
        )
        .first());

    if (ev) {
      await ctx.db.patch(ev._id, { processed: true });
    } else {
      console.warn(
        `Webhook event with key ${webhookId ?? lemonId} not found in database`
      );
    }
  },
});

/* --------------------------------------------------------------
 * Manual Webhook Processing (for testing/debugging)
 * -------------------------------------------------------------- */
export const processUnprocessedWebhooks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processed", (q: any) => q.eq("processed", false))
      .take(50);

    for (const ev of events) {
      try {
        await ctx.runMutation(internal.billing.handleEvent, {
          eventName: ev.eventName,
          payload: ev.payload,
        });
      } catch (error) {
        console.error(
          `Error processing webhook event ${ev._id} (lemonId: ${ev.lemonId}):`,
          error
        );
      }
    }

    return { processed: events.length };
  },
});

/* --------------------------------------------------------------
 * Create Checkout
 * -------------------------------------------------------------- */

export const createCheckout = action({
  args: {
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    variantId: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { organizationId, clerkUserId, variantId, userEmail }
  ): Promise<{
    ok: boolean;
    error: string;
    details?: string;
    code?: string;
    url?: string;
    tier?: string;
    hint?: string;
    variantId?: string;
    storeId?: string;
  }> => {
    const caller = await ctx.auth.getUserIdentity();
    if (!caller || caller.subject !== clerkUserId) {
      return { ok: false, error: "Unauthorized" };
    }

    const viewerRole = await ctx.runQuery(api.billing.getViewerRole, {
      organizationId,
      clerkUserId,
    });
    if (viewerRole !== "admin") {
      return {
        ok: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      };
    }

    const hasActive = await ctx.runQuery(
      api.billing.hasActiveSubscriptionForVariant,
      {
        organizationId,
        variantId,
      }
    );

    if (hasActive) {
      const { tier } = mapVariantToPlan(variantId);
      return {
        ok: false,
        error: "You already have an active subscription for this plan",
        code: "ALREADY_SUBSCRIBED",
        tier,
        hint: "You cannot subscribe to the same plan multiple times. Please cancel your current subscription first or upgrade/downgrade to a different plan.",
      };
    }

    const apiKey = process.env.LEMON_SECRET_KEY;
    const storeId = process.env.LEMON_STORE_ID;

    if (!apiKey || !storeId) {
      return {
        ok: false,
        error: "Missing Lemon Squeezy API credentials",
      };
    }

    // (A) Ensure the store is reachable with the provided API key
    {
      const checkStore = await fetch(
        `https://api.lemonsqueezy.com/v1/stores/${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (!checkStore.ok) {
        const msg = await checkStore.text();
        return {
          ok: false,
          error: "Store not accessible with this key",
          details: msg,
        };
      }
    }

    // (B) Ensure the variant exists and belongs to the same store/environment
    {
      const checkVariant = await fetch(
        `https://api.lemonsqueezy.com/v1/variants/${variantId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      if (!checkVariant.ok) {
        const msg = await checkVariant.text();
        return {
          ok: false,
          error: "Variant not found or not accessible",
          details: msg,
          variantId,
          hint: "Make sure the variant ID exists in your Lemon Squeezy store and matches the environment (test/production)",
        };
      }

      const variantData = await checkVariant.json();
      const variantStoreId =
        variantData?.data?.relationships?.product?.data?.id;

      // Note: we might need a product-to-store check depending on Lemon API shape
    }

    // Get Zendesk subdomain from connection (required for Zendesk plan)
    const zendeskConnection = await ctx.runQuery(
      api.zendesk.getConnectionByOrg,
      {
        organizationId,
      }
    );
    const zendeskSubdomain = zendeskConnection?.subdomain as string | undefined;

    if (!zendeskSubdomain) {
      return {
        ok: false,
        error: "Zendesk connection not found",
        code: "ZENDESK_NOT_CONNECTED",
        hint: "Please connect your Zendesk account before subscribing to the Zendesk plan.",
      };
    }

    // Create Checkout
    const checkoutPayload: any = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: {
              organizationId,
              clerkUserId,
              zendesk_subdomain: zendeskSubdomain,
            },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId.toString() } },
          variant: { data: { type: "variants", id: variantId.toString() } },
        },
      },
    };

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!res.ok) {
      const err: string = await res.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(err);
      } catch {
        errorDetails = err;
      }

      return {
        ok: false,
        error: "Lemon API Error",
        details: errorDetails,
        variantId,
        storeId,
        hint:
          errorDetails?.errors?.[0]?.detail ||
          "Check if variant exists and is linked to the correct store",
      };
    }

    const json = await res.json();
    const checkoutUrl = json?.data?.attributes?.url as string | undefined;
    if (!checkoutUrl) {
      return {
        ok: false,
        error: "Missing checkout URL",
        details: json?.data?.attributes?.url,
        variantId,
        storeId,
        hint: "Check if variant exists and is linked to the correct store",
      };
    }

    return { ok: true, url: checkoutUrl, error: "" };
  },
});

/* --------------------------------------------------------------
 * Redirect to Billing Portal (manage / cancel subscription)
 * -------------------------------------------------------------- */

export const redirectToBillingPortal = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) {
      return { ok: false, error: "Unauthorized", code: "UNAUTHENTICATED" };
    }

    const viewerRole = await ctx.runQuery(api.billing.getViewerRole, {
      organizationId,
      clerkUserId: caller.subject,
    });
    if (viewerRole !== "admin") {
      return {
        ok: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      };
    }

    const activeSub = await ctx.runQuery(api.billing.getActiveSubscription, {
      organizationId,
    });

    if (!activeSub) {
      return {
        ok: false,
        error: "No active subscription for this organization",
        code: "NO_ACTIVE_SUBSCRIPTION",
        hint: "You can only access the billing portal if you already have an active subscription.",
      };
    }

    const portalUrl = "https://repvix.lemonsqueezy.com/billing";

    return {
      ok: true,
      url: portalUrl,
    };
  },
});

export const createBillingPortal = action({
  args: { organizationId: v.id("organizations") },
  handler: async (
    ctx,
    { organizationId }
  ): Promise<{
    ok: boolean;
    error: string;
    details?: string;
    code?: string;
    url?: string;
  }> => {
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) {
      return { ok: false, error: "Unauthorized", code: "UNAUTHENTICATED" };
    }

    const viewerRole = await ctx.runQuery(api.billing.getViewerRole, {
      organizationId,
      clerkUserId: caller.subject,
    });
    if (viewerRole !== "admin") {
      return {
        ok: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      };
    }

    const apiKey = process.env.LEMON_SECRET_KEY;
    if (!apiKey) throw new Error("Missing Lemon Squeezy API credentials");

    const activeSub = await ctx.runQuery(api.billing.getActiveSubscription, {
      organizationId,
    });

    if (!activeSub || !activeSub.lemonSubscriptionId) {
      return {
        ok: false,
        error: "No active subscription for this organization",
        code: "NO_ACTIVE_SUBSCRIPTION",
      };
    }

    // Fallback: use stored portal URL if available before hitting Lemon API.
    const storedSub = await ctx.runQuery(api.subscriptions.getByOrg, {
      organizationId,
    });
    if (storedSub?.customerPortal) {
      return {
        ok: true,
        error: "",
        url: storedSub.customerPortal,
      };
    }

    const subRes = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${activeSub.lemonSubscriptionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!subRes.ok) {
      const errText = await subRes.text();
      return {
        ok: false,
        error: "Failed to fetch subscription from Lemon",
        details: errText ?? undefined,
      };
    }

    const subJson = await subRes.json();
    const urls = subJson?.data?.attributes?.urls ?? {};

    const portalUrl = urls.customer_portal || storedSub?.customerPortal;

    if (!portalUrl) {
      return {
        ok: false,
        error: "Customer portal URL missing from Lemon API",
        details: subJson?.data?.attributes?.urls?.customer_portal ?? undefined,
      };
    }

    return {
      ok: true,
      error: "",
      url: portalUrl,
      code: "CUSTOMER_PORTAL_URL_MISSING",
    };
  },
});

// === Account Deletion =======================================================

export const deleteAccountAndData = action({
  args: { organizationId: v.id("organizations") },
  handler: async (
    ctx,
    { organizationId }
  ): Promise<{ ok: boolean; error?: string; code?: string }> => {
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) {
      return { ok: false, error: "Unauthorized", code: "UNAUTHENTICATED" };
    }

    const viewerRole = await ctx.runQuery(api.billing.getViewerRole, {
      organizationId,
      clerkUserId: caller.subject,
    });
    if (viewerRole !== "admin") {
      return {
        ok: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      };
    }

    const org = (await ctx.runQuery(internal.billing.getOrgById, {
      organizationId,
    })) as { clerkOrgId?: string } | null;

    // Cancel active subscription if exists
    const activeSub = await ctx.runQuery(api.billing.getActiveSubscription, {
      organizationId,
    });

    if (activeSub?.lemonSubscriptionId) {
      const apiKey = process.env.LEMON_SECRET_KEY;
      if (!apiKey) {
        return { ok: false, error: "Missing Lemon Squeezy API credentials" };
      }

      try {
        await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${activeSub.lemonSubscriptionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
            body: JSON.stringify({
              data: {
                id: activeSub.lemonSubscriptionId,
                type: "subscriptions",
                attributes: { cancelled: true },
              },
            }),
          }
        );
      } catch (error) {
        console.error("Failed to cancel Lemon subscription", error);
        // Continue deletion even if cancel fails
      }
    }

    if (org?.clerkOrgId) {
      const clerkKey = process.env.CLERK_SECRET_KEY;
      if (!clerkKey) {
        return { ok: false, error: "Missing Clerk secret key" };
      }
      try {
        await fetch(
          `https://api.clerk.com/v1/organizations/${org.clerkOrgId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${clerkKey}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        console.error("Failed to delete Clerk organization", error);
        return { ok: false, error: "Failed to delete Clerk organization" };
      }
    }

    // Delete organization-related data in Convex via internal mutation
    return await ctx.runMutation(internal.billing.deleteOrgData, {
      organizationId,
    });
  },
});

export const deleteOrgData = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (
    ctx,
    { organizationId }
  ): Promise<{ ok: boolean; error?: string }> => {
    // Gather chats for this org to cascade delete chatMessages & embeddings
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect();
    const chatIds = chats.map((c) => c._id);

    // Delete chatMessages and messageEmbeddings per chatId
    for (const chatId of chatIds) {
      const chatMessages = await ctx.db
        .query("chatMessages")
        .withIndex("by_chat", (q: any) => q.eq("chatId", chatId))
        .collect();
      for (const msg of chatMessages) {
        await ctx.db.delete(msg._id);
      }

      const embeddings = await ctx.db
        .query("messageEmbeddings")
        .withIndex("by_chat", (q: any) => q.eq("chatId", chatId))
        .collect()
        .catch(() => [] as any[]);
      for (const emb of embeddings) {
        await ctx.db.delete(emb._id);
      }
    }

    const tablesToDeleteByOrg = [
      "subscriptions",
      "invoices",
      "billingCustomers",
      "organizationMembers",
      "chatAnalyses",
      "globalAnalyses",
      "chatMessages",
      "chats",
      "messages",
      "webhookEvents",
    ] as const;

    for (const table of tablesToDeleteByOrg) {
      let items: any[] = [];
      try {
        items = await ctx.db
          .query(table as any)
          .withIndex("by_org", (q: any) =>
            q.eq("organizationId", organizationId)
          )
          .collect();
      } catch {
        // Fallback: full scan then filter by organizationId when index missing.
        const all = await ctx.db.query(table as any).collect();
        items = all.filter((x) => x.organizationId === organizationId);
      }

      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }

    await ctx.db.delete(organizationId);
    return { ok: true };
  },
});

export const getOrgById = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db.get(organizationId);
  },
});

// Delete only the caller's membership(s) without touching org data
export const deleteUserAccount = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; error?: string }> => {
    const caller = await ctx.auth.getUserIdentity();
    if (!caller) {
      return { ok: false, error: "Unauthorized" };
    }

    await ctx.runMutation(internal.billing.deleteUserData, {
      clerkUserId: caller.subject,
    });

    return { ok: true };
  },
});

export const deleteUserData = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    // Remove all memberships for this user across orgs
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect();

    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }

    // Remove billing customers entries tied to this user if any
    const billingCustomers = await ctx.db
      .query("billingCustomers")
      .withIndex("by_org", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect()
      .catch(() => [] as any[]);

    for (const c of billingCustomers) {
      await ctx.db.delete(c._id);
    }

    return { ok: true };
  },
});
