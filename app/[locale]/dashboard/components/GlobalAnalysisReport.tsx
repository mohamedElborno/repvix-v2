"use client";

import { useTranslations } from "next-intl";
import { forwardRef } from "react";
import type { GlobalAnalysis } from "../types/dashboard";

interface GlobalAnalysisReportProps {
  analysis: GlobalAnalysis;
  memberIdToName: Record<string, string>;
}

export const GlobalAnalysisReport = forwardRef<
  HTMLDivElement,
  GlobalAnalysisReportProps
>(({ analysis, memberIdToName }, ref) => {
  const t = useTranslations("dashboard");

  return (
    <div
      ref={ref}
      className="print-only hidden print:block bg-white text-black font-sans"
      style={{ padding: "10mm" }}
    >
      {/* Report Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("globalAnalysis")}
          </h1>
          <p className="text-gray-600 text-sm">
            {new Date(analysis.createdAt).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Executive Summary Section */}
      <div className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-purple-600 pl-3">
          {t("executiveSummary")}
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-gray-800 leading-relaxed text-sm text-justify">
          {analysis.overallSummary}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-10 break-inside-avoid">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            {t("satisfaction")}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {analysis.customerSatisfactionScore
              ? `${Math.round(analysis.customerSatisfactionScore)}%`
              : "N/A"}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            {t("sentiment")}
          </p>
          <p className="text-lg font-bold text-gray-900 capitalize">
            {analysis.overallSentiment || "N/A"}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            {t("riskScore")}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {analysis.riskScore ? `${Math.round(analysis.riskScore)}%` : "N/A"}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
            {t("churnRisk")}
          </p>
          <p className="text-lg font-bold text-gray-900 capitalize">
            {analysis.churnRiskLevel || "N/A"}
          </p>
        </div>
      </div>

      {/* Topics & Issues - 2 Columns */}
      <div className="grid grid-cols-2 gap-8 mb-10 break-inside-avoid">
        {/* Common Topics */}
        {analysis.commonTopics && analysis.commonTopics.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">
              {t("commonTopics") || "Common Topics"}
            </h3>
            <ul className="space-y-2">
              {analysis.commonTopics.slice(0, 5).map((topic, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Common Issues */}
        {analysis.commonIssues && analysis.commonIssues.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">
              {t("commonIssues")}
            </h3>
            <ul className="space-y-2">
              {analysis.commonIssues.slice(0, 5).map((issue, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="inline-block w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Insights Sections */}
      <div className="space-y-6 mb-10 break-inside-avoid">
        {analysis.operationalInsights &&
          analysis.operationalInsights.length > 0 && (
            <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
              <h3 className="text-md font-bold text-blue-900 mb-3">
                {t("operationalInsights")}
              </h3>
              <ul className="space-y-2">
                {analysis.operationalInsights.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-800">
                    <span className="text-blue-500">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {analysis.productInsights && analysis.productInsights.length > 0 && (
          <div className="bg-indigo-50/50 p-5 rounded-lg border border-indigo-100">
            <h3 className="text-md font-bold text-indigo-900 mb-3">
              {t("productInsights")}
            </h3>
            <ul className="space-y-2">
              {analysis.productInsights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="text-indigo-500">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Agent Performance Table */}
      {analysis.agentLeaderboard && analysis.agentLeaderboard.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-purple-600 pl-3">
            {t("agentLeaderboard")}
          </h2>
          <div className="w-full overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm text-start text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3">{t("report.agent")}</th>
                  <th className="px-4 py-3 text-center">{t("report.score")}</th>
                  <th className="px-4 py-3">{t("report.strengths")}</th>
                  <th className="px-4 py-3">{t("report.improvements")}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.agentLeaderboard.slice(0, 5).map((agent, i) => (
                  <tr key={i} className="border-b bg-white last:border-b-0">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {agent.agentId && agent.agentId !== "unknown"
                        ? memberIdToName[agent.agentId] || `Agent ${i + 1}`
                        : `Agent ${i + 1}`}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-600">
                      {Math.round(agent.score)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-green-700">
                      {agent.strengthSummary}
                    </td>
                    <td className="px-4 py-3 text-xs text-orange-700">
                      {agent.improvementSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Improvement Actions */}
      {analysis.improvementActions &&
        analysis.improvementActions.length > 0 && (
          <div className="mb-10 break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-yellow-500 pl-3">
              {t("improvementActions")}
            </h2>
            <div className="grid gap-3">
              {analysis.improvementActions.map((action, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div
                    className={`flex-shrink-0 w-16 text-center py-1 px-2 rounded text-xs font-bold uppercase h-fit ${
                      action.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : action.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {action.priority}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
        <p>{new Date().toLocaleString()}</p>
      </div>
    </div>
  );
});

GlobalAnalysisReport.displayName = "GlobalAnalysisReport";
