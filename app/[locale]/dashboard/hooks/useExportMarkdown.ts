import { useCallback } from "react";
import { toast } from "sonner";
import type { GlobalAnalysis } from "../types/dashboard";

type TFunction = (key: string) => string | undefined;

type UseExportMarkdownParams = {
  analysis: GlobalAnalysis | null;
  memberIdToName: Record<string, string>;
  canExportMarkdown: boolean;
  t: TFunction;
};

export function useExportMarkdown({
  analysis,
  memberIdToName,
  canExportMarkdown,
  t,
}: UseExportMarkdownParams) {
  return useCallback(() => {
    if (!analysis) return;
    if (!canExportMarkdown) {
      toast.error(t("exportMarkdownPlan") || "Upgrade plan to export Markdown");
      return;
    }

    const formatList = (items?: string[]) =>
      items && items.length > 0
        ? items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
        : "N/A";

    const formatAgents = () =>
      analysis.agentLeaderboard && analysis.agentLeaderboard.length > 0
        ? analysis.agentLeaderboard
            .slice(0, 5)
            .map((a, idx) => {
              const name =
                a.agentId && a.agentId !== "unknown"
                  ? memberIdToName[a.agentId] || `Agent ${idx + 1}`
                  : `Agent ${idx + 1}`;
              return `${idx + 1}. ${name} - ${Math.round(a.score)}%\n   ${t("report.strengths") || "Strengths"}: ${
                a.strengthSummary || "N/A"
              }\n   ${t("report.improvements") || "Improvements"}: ${a.improvementSummary || "N/A"}`;
            })
            .join("\n\n")
        : "N/A";

    const md = [
      `# ${t("globalAnalysis") || "Global Analysis"}`,
      `_${new Date(analysis.createdAt).toLocaleDateString()}_`,
      "",
      `## ${t("executiveSummary") || "Executive Summary"}`,
      analysis.overallSummary || "N/A",
      "",
      `## ${t("keyMetrics") || "Key Metrics"}`,
      `- ${t("satisfaction") || "Satisfaction"}: ${
        analysis.customerSatisfactionScore != null
          ? `${Math.round(analysis.customerSatisfactionScore)}%`
          : "N/A"
      }`,
      `- ${t("sentiment") || "Sentiment"}: ${analysis.overallSentiment || "N/A"}`,
      `- ${t("riskScore") || "Risk Score"}: ${
        analysis.riskScore != null
          ? `${Math.round(analysis.riskScore)}%`
          : "N/A"
      }`,
      `- ${t("churnRisk") || "Churn Risk"}: ${analysis.churnRiskLevel || "N/A"}`,
      "",
      `## ${t("commonTopics") || "Common Topics"}`,
      formatList(analysis.commonTopics),
      "",
      `## ${t("commonIssues") || "Common Issues"}`,
      formatList(analysis.commonIssues),
      "",
      `## ${t("operationalInsights") || "Operational Insights"}`,
      formatList(analysis.operationalInsights),
      "",
      `## ${t("productInsights") || "Product Insights"}`,
      formatList(analysis.productInsights),
      "",
      `## ${t("agentLeaderboard") || "Agent Leaderboard"}`,
      formatAgents(),
      "",
      `## ${t("improvementActions") || "Improvement Actions"}`,
      analysis.improvementActions && analysis.improvementActions.length > 0
        ? analysis.improvementActions
            .map((a, idx) =>
              `${idx + 1}. [${a.priority}] ${a.title}\n   ${a.description || ""}`.trim()
            )
            .join("\n\n")
        : "N/A",
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `global-analysis-${new Date().toISOString().split("T")[0]}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t("downloadMarkdownSuccess") || "Markdown exported");
  }, [analysis, canExportMarkdown, memberIdToName, t]);
}
