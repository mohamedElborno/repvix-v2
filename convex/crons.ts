import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Process LemonSqueezy billing events",
  { seconds: 10 },
  internal.billingProcessor.run
);

export default crons;
