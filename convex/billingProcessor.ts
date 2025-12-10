import { internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const unprocessed = internalQuery(async (ctx) => {
  return await ctx.db
    .query("webhookEvents")
    .withIndex("by_processed", (q) => q.eq("processed", false))
    .take(20);
});

export const processOne = internalMutation(
  async (ctx, { event }: { event: any }) => {
    try {
      await ctx.runMutation(internal.billing.handleEvent, {
        eventName: event.eventName,
        payload: event.payload,
      });

      const updated =
        (event.webhookId &&
          (await ctx.db
            .query("webhookEvents")
            .withIndex("by_webhookId", (q) =>
              q.eq("webhookId", event.webhookId)
            )
            .first())) ||
        (await ctx.db
          .query("webhookEvents")
          .withIndex("by_lemonId", (q) => q.eq("lemonId", event.lemonId))
          .first());

      if (updated && !updated.processed) {
        await ctx.db.patch(updated._id, { processed: true });
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event._id}:`, error);
      throw error;
    }
  }
);

export const run = internalMutation(async (ctx) => {
  const events = await ctx.runQuery(internal.billingProcessor.unprocessed, {});

  for (const ev of events) {
    try {
      await ctx.runMutation(internal.billingProcessor.processOne, {
        event: ev,
      });
    } catch (error) {
      console.error(
        `Failed to process webhook event ${ev._id} (lemonId: ${ev.lemonId}, eventName: ${ev.eventName}):`,
        error
      );
      // Continue processing other events even if one fails
    }
  }
});
