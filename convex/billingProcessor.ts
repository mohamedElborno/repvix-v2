import { internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const unprocessed = internalQuery(async (ctx) => {
  return await ctx.db
    .query("webhookEvents")
    .withIndex("by_processed", (q) => q.eq("processed", false))
    .take(20);
});

export const processOne = internalMutation(
  async (ctx, { event }: { event: any }) => {
    // نفّذ الحدث
    await ctx.runMutation(api.billing.handleEvent, {
      eventName: event.eventName,
      payload: event.payload,
    });

    // علّم أنه تمت معالجته
    await ctx.db.patch(event._id, { processed: true });
  }
);

export const run = internalMutation(async (ctx) => {
  const events = await ctx.runQuery(internal.billingProcessor.unprocessed, {});

  for (const ev of events) {
    await ctx.runMutation(internal.billingProcessor.processOne, { event: ev });
  }
});
