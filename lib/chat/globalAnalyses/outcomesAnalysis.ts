import { weightByConfidence } from "./utilities";
import { wavg } from "./utilities";

export function analyzeOutcomes(analyses: any[]) {
  const weights = analyses.map((a) => weightByConfidence(a.outcomeConfidence));

  const resolvedLike = analyses.map((a) =>
    a.outcomeStatus === "resolved" || a.outcomeStatus === "partially_resolved"
      ? 1
      : 0
  );
  const unresolved = analyses.map((a) =>
    a.outcomeStatus === "unresolved" ? 1 : 0
  );
  const escalated = analyses.map((a) =>
    a.outcomeStatus === "escalated" ? 1 : 0
  );
  const pending = analyses.map((a) =>
    a.outcomeStatus === "pending_customer" ||
    a.outcomeStatus === "pending_internal"
      ? 1
      : 0
  );
  const followup = analyses.map((a) => (a.requiresFollowUp ? 1 : 0));

  return {
    totalChats: analyses.length,
    resolvedRate: wavg(resolvedLike, weights),
    unresolvedRate: wavg(unresolved, weights),
    escalatedRate: wavg(escalated, weights),
    followupRate: wavg(followup, weights),
    pendingRate: wavg(pending, weights),
  };
}
