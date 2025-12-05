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
    try {
      // نفّذ الحدث
      await ctx.runMutation(api.billing.handleEvent, {
        eventName: event.eventName,
        payload: event.payload,
      });

      // handleEvent يقوم بتحديث processed بنفسه، لكن نتأكد هنا أيضاً
      // في حالة فشل handleEvent في تحديث processed
      const updated = await ctx.db
        .query("webhookEvents")
        .withIndex("by_lemonId", (q) => q.eq("lemonId", event.lemonId))
        .first();

      if (updated && !updated.processed) {
        await ctx.db.patch(updated._id, { processed: true });
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event._id}:`, error);
      // لا نحدّث processed في حالة الخطأ حتى يمكن إعادة المحاولة
      throw error;
    }
  }
);

export const run = internalMutation(async (ctx) => {
  const events = await ctx.runQuery(internal.billingProcessor.unprocessed, {});

  console.log(`Processing ${events.length} unprocessed webhook events`);

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

  console.log(`Finished processing ${events.length} webhook events`);
});
