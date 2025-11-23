"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  User as UserIcon,
  Crown,
  Edit,
  Trash2,
  MoreVertical,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  manager_id: string;
  full_name?: string | null;
  name?: string | null; // للتوافق مع السجلات القديمة
  email: string;
  role: "sales" | "support" | "manager";
  phone?: string;
  image_url?: string;
  created_at: string;
}

interface EmployeeGlobalAnalysis {
  id: string;
  employee_id: string;
  total_chats: number;
  total_messages: number;
  overall_summary: string;
  common_topics: string[];
  overall_sentiment: string;
  insights: string;
  recommendations: string;
  strengths: string;
  weaknesses: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeDetailsClientProps {
  employee: Employee;
}

export default function EmployeeDetailsClient({
  employee,
}: EmployeeDetailsClientProps) {
  const t = useTranslations("team");
  const locale = useLocale();
  const router = useRouter();
  const [_isLoading, setIsLoading] = useState(false);
  const [globalAnalysis, setGlobalAnalysis] =
    useState<EmployeeGlobalAnalysis | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [formattedJoinedDate, setFormattedJoinedDate] = useState<string>("");
  const [formattedUpdatedDate, setFormattedUpdatedDate] = useState<string>("");

  const fetchGlobalAnalysis = useCallback(async () => {
    try {
      setIsLoadingAnalysis(true);
      const response = await fetch(
        `/api/employees/${employee.id}/global-analysis`
      );
      const data = await response.json();

      if (data.success && data.analysis) {
        setGlobalAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error fetching global analysis:", error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [employee.id]);

  useEffect(() => {
    fetchGlobalAnalysis();
  }, [fetchGlobalAnalysis]);

  useEffect(() => {
    // Format dates only on client side to avoid hydration mismatch
    setFormattedJoinedDate(
      new Date(employee.created_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, [employee.created_at, locale]);

  useEffect(() => {
    // Format updated date when globalAnalysis is available
    if (globalAnalysis?.updated_at) {
      setFormattedUpdatedDate(
        new Date(globalAnalysis.updated_at).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }
  }, [globalAnalysis?.updated_at, locale]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "sales":
        return <UserIcon className="w-5 h-5" />;
      case "support":
        return <Shield className="w-5 h-5" />;
      case "manager":
        return <Crown className="w-5 h-5" />;
      default:
        return <UserIcon className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "sales":
        return "bg-green-100 text-green-800 border-green-200";
      case "support":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "manager":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-200";
      case "negative":
        return "bg-red-100 text-red-800 border-red-200";
      case "neutral":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "mixed":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return <CheckCircle className="w-4 h-4" />;
      case "negative":
        return <AlertCircle className="w-4 h-4" />;
      case "neutral":
        return <MessageSquare className="w-4 h-4" />;
      case "mixed":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const handleDeleteEmployee = async () => {
    if (!confirm(t("confirmDeleteEmployee"))) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/my-team");
      } else {
        console.error("Failed to delete employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("employeeDetails")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("employeeDetailsSubtitle")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              {t("editEmployee")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeleteEmployee}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("deleteEmployee")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Employee Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={employee.image_url}
              alt={employee.full_name || employee.name || employee.email}
            />
            <AvatarFallback className="text-2xl">
              {(employee.full_name || employee.name || employee.email)
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {employee.full_name || employee.name || employee.email}
              </h2>
              <Badge
                className={`${getRoleColor(employee.role)} flex items-center gap-1`}
              >
                {getRoleIcon(employee.role)}
                {t(`roles.${employee.role}`)}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{employee.email}</span>
              </div>

              {employee.phone && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("joined")}{" "}
                  {formattedJoinedDate || (
                    <span className="opacity-50">Loading...</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("contactInformation")}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t("email")}
              </label>
              <p className="font-medium">{employee.email}</p>
            </div>
            {employee.phone && (
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t("phone")}
                </label>
                <p className="font-medium">{employee.phone}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("roleAndPermissions")}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t("role")}
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={`${getRoleColor(employee.role)} flex items-center gap-1`}
                >
                  {getRoleIcon(employee.role)}
                  {t(`roles.${employee.role}`)}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t("employeeId")}
              </label>
              <p className="font-mono text-sm">{employee.id}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => router.push(`/dashboard/my-team/${employee.id}/edit`)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          {t("editEmployee")}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/my-team/${employee.id}/chats`)}
        >
          {t("viewChats")}
        </Button>
      </div>

      {/* Global Analysis Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("performanceAnalysis")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t("latestAnalysisFor", {
                name: employee.full_name || employee.name || employee.email,
              })}
            </p>
          </div>
        </div>

        {isLoadingAnalysis ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">{t("loadingAnalysis")}</p>
            </div>
          </div>
        ) : globalAnalysis ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t("totalChats")}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {globalAnalysis.total_chats}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("totalMessages")}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {globalAnalysis.total_messages}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t("sentiment")}</p>
                    <Badge
                      className={`${getSentimentColor(globalAnalysis.overall_sentiment)} flex items-center gap-1 mt-1`}
                    >
                      {getSentimentIcon(globalAnalysis.overall_sentiment)}
                      {t(
                        `sentiments.${globalAnalysis.overall_sentiment?.toLowerCase()}`
                      ) ||
                        globalAnalysis.overall_sentiment
                          ?.charAt(0)
                          .toUpperCase() +
                          globalAnalysis.overall_sentiment?.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            {globalAnalysis.overall_summary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t("overallSummary")}
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                  {globalAnalysis.overall_summary}
                </p>
              </div>
            )}

            {/* Topics */}
            {globalAnalysis.common_topics &&
              globalAnalysis.common_topics.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {t("commonTopics")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {globalAnalysis.common_topics.map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {/* Insights and Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalAnalysis.insights && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t("keyInsights")}
                  </h4>
                  <p className="text-blue-800 text-sm">
                    {globalAnalysis.insights}
                  </p>
                </div>
              )}

              {globalAnalysis.recommendations && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {t("recommendations")}
                  </h4>
                  <p className="text-green-800 text-sm">
                    {globalAnalysis.recommendations}
                  </p>
                </div>
              )}
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalAnalysis.strengths && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {t("strengths")}
                  </h4>
                  <p className="text-green-800 text-sm">
                    {globalAnalysis.strengths}
                  </p>
                </div>
              )}

              {globalAnalysis.weaknesses && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t("areasForImprovement")}
                  </h4>
                  <p className="text-orange-800 text-sm">
                    {globalAnalysis.weaknesses}
                  </p>
                </div>
              )}
            </div>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
              {t("lastUpdated")}:{" "}
              {formattedUpdatedDate || (
                <span className="opacity-50">Loading...</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("noAnalysisAvailable")}
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t("noAnalysisGenerated")}
            </p>
            <Button
              variant="outline"
              onClick={fetchGlobalAnalysis}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t("generateAnalysis")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
