"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WhatsAppChatStats {
  totalMessages: number;
  totalParticipants: number;
  systemMessages: number;
  regularMessages: number;
  messagesPerParticipant: Record<string, number>;
  dateRange: { start: string; end: string };
}
interface UploadChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadChatDialog({
  isOpen,
  onClose,
}: UploadChatDialogProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [whatsAppStats, setWhatsAppStats] = useState<WhatsAppChatStats | null>(
    null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !rawText.trim()) {
      setError(t("fillAllFields"));
      return;
    }

    setIsLoading(true);

    try {
      // ✅ new endpoint built on Convex (ingestion only)
      const response = await fetch("/api/chats/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          rawText: rawText.trim(),
          customerName: customerName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // The backend must return { error: "..."} in case of failure
        throw new Error(data.error || data.details || "Failed to import chat");
      }

      // Optional: if the backend calculates WhatsApp statistics
      if (data.isWhatsApp && data.whatsAppStats) {
        setIsWhatsApp(true);
        setWhatsAppStats(data.whatsAppStats);
        console.log("WhatsApp chat processed:", data.whatsAppStats);
      }

      // Reset form
      setTitle("");
      setRawText("");
      setIsWhatsApp(false);
      setWhatsAppStats(null);
      onClose();

      // The path remains the same: it depends on you displaying the ChatView page based on the chatId (Convex)
      router.push(`/dashboard/chats/${data.chatId}`);
    } catch (err) {
      console.error("Error uploading chat:", err);
      setError(err instanceof Error ? err.message : "Failed to upload chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(
      (file) => file.type === "text/plain" || file.name.endsWith(".txt")
    );

    if (textFile) {
      processFile(textFile);
    } else {
      setError("Please drop a .txt file");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawText(text);
      if (!title) {
        setTitle("Pasted Chat");
      }
    } catch (_error) {
      setError("Failed to read from clipboard. Please paste manually (Ctrl+V)");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white/90">
            {t("uploadNewChat")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* WhatsApp Instructions */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2">
                📱 How to Export WhatsApp Chats
              </h4>
              <div className="text-xs text-blue-400/70 space-y-2">
                <div className="bg-blue-500/5 p-2 rounded border border-blue-500/10">
                  <p className="font-medium text-blue-300 mb-1">
                    🚀 Quick Method (Recommended):
                  </p>
                  <p>1. Export chat from WhatsApp</p>
                  <p>2. Open the .txt file</p>
                  <p>3. Copy all content (Ctrl+A, Ctrl+C)</p>
                  <p>4. Paste here in the text area below</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <p>
                      <strong>From Phone:</strong>
                    </p>
                    <p>
                      Open chat → Tap name → Export chat → Choose &quot;Without
                      media&quot;
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>From WhatsApp Web:</strong>
                    </p>
                    <p>Open chat → Click ⋮ → Export chat → Download</p>
                  </div>
                </div>
                <p className="text-blue-300 font-medium">
                  💡 Tip: You can also drag & drop the .txt file directly here!
                </p>
              </div>
            </div>
            {/* Title Input */}
            <div>
              <Label htmlFor="title" className="text-white/80 mb-2">
                {t("chatTitle")}
              </Label>
              {/* Customer Name Input */}
              <div>
                <Label htmlFor="customerName" className="text-white/80 mb-2">
                  اسم العميل في واتساب (اختياري لكن يُفضَّل)
                </Label>
                <Input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: [phone number] أو اسم العميل كما يظهر في واتساب"
                  className="bg-white/5 border-white/10 text-white placeholder-white/40"
                  disabled={isLoading}
                />
                <p className="text-xs text-white/40 mt-1">
                  سنحاول تقريب الاسم الذي أدخلته مع الأسماء الموجودة في المحادثة
                  حتى لو كان فيه أخطاء بسيطة أو اختلاف بسيط في الكتابة.
                </p>
              </div>

              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("chatTitlePlaceholder")}
                className="bg-white/5 border-white/10 text-white placeholder-white/40"
                disabled={isLoading}
              />
            </div>

            {/* File Upload */}
            <div>
              <Label className="text-white/80 mb-2">
                {t("uploadFile")} {t("optional")}
              </Label>
              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-lg hover:border-purple-500/50 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-white/60" />
                  <span className="text-white/60">{t("selectFile")}</span>
                </label>
              </div>
              <p className="text-xs text-white/40 mt-2">
                {t("supportedFormats")} - WhatsApp exports (.txt)
              </p>
            </div>

            {/* Text Area with Drag & Drop */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="rawText" className="text-white/80">
                  {t("chatContent")}
                </Label>
                <Button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs"
                >
                  📋 Paste from Clipboard
                </Button>
              </div>
              <div
                className={`relative border-2 border-dashed rounded-lg transition-colors ${
                  isDragOver
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-white/10"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  id="rawText"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t("chatContentPlaceholder")}
                  rows={12}
                  className="w-full p-3 bg-white/5 border-0 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  disabled={isLoading}
                />
                {isDragOver && (
                  <div className="absolute inset-0 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-purple-400 font-medium">
                        Drop your WhatsApp .txt file here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* WhatsApp Stats */}
            {isWhatsApp && whatsAppStats && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 font-medium">
                    WhatsApp Chat Detected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-400/70">Total Messages:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      {whatsAppStats.totalMessages}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-400/70">Participants:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      {whatsAppStats.totalParticipants}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-400/70">Regular Messages:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      {whatsAppStats.regularMessages}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-400/70">System Messages:</span>
                    <span className="text-green-400 ml-2 font-medium">
                      {whatsAppStats.systemMessages}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-green-400/70">
                  Date Range: {whatsAppStats.dateRange.start} -{" "}
                  {whatsAppStats.dateRange.end}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !title.trim() || !rawText.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {t("upload")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
