import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process unprocessed webhook events
crons.interval(
  "Process LemonSqueezy billing events",
  { seconds: 10 },
  internal.billingProcessor.run
);

// Clean up old rate limit records (every hour)
crons.interval(
  "Clean up old rate limit records",
  { hours: 1 },
  internal.webhookRateLimit.cleanupOldRecords
);

// Clean up old analysis jobs (every 6 hours)
crons.interval(
  "Clean up old analysis jobs",
  { hours: 6 },
  internal.analysisJobs.cleanupOldJobs
);

export default crons;
