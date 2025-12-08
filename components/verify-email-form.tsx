"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowRight, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

export function VerifyEmailForm() {
  // Translations
  const t = useTranslations("verifyEmail");
  // Sign Up
  const { signUp, isLoaded, setActive } = useSignUp();
  // Router
  const router = useRouter();
  // State
  const [isLoading, setIsLoading] = useState(false);
  // Code
  const [code, setCode] = useState("");

  // Handle verify
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    if (code.length !== 6) {
      toast.error(t("invalidCode") || "Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success(
          t("verificationSuccess") || "Email verified successfully!"
        );
        
        // Create profile automatically after email verification
        try {
          // This will be handled by a webhook or on first dashboard visit
          // For now, we'll just redirect
        } catch (err) {
          console.error("Failed to create profile:", err);
          // Don't block the redirect if profile creation fails
        }
        
        router.push(`/dashboard/setup`);
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || t("errorOccurred"));
      // Clear code on error
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      toast.success(
        t("codeResent") || "Verification code resent! Please check your email."
      );
      setCode("");
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || t("errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/30">
          <Mail className="h-8 w-8 text-purple-300" />
        </div>
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80 mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-white/70">{t("subtitle")}</p>
        {signUp?.emailAddress && (
          <p className="mt-2 text-xs text-white/60">
            {t("sentTo")}{" "}
            <span className="font-medium text-white/80">
              {signUp.emailAddress}
            </span>
          </p>
        )}
      </div>

      {/* Verification Code Input */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-3 text-center">
            {t("enterCode")}
          </label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                <InputOTPSlot
                  index={0}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
                <InputOTPSlot
                  index={1}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
                <InputOTPSlot
                  index={2}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
                <InputOTPSlot
                  index={3}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
                <InputOTPSlot
                  index={4}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
                <InputOTPSlot
                  index={5}
                  className="h-14 w-12 text-2xl font-bold text-white border-white/10 bg-white/5 backdrop-blur-md rounded-xl first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-purple-500/50 data-[active=true]:ring-purple-500/50 data-[active=true]:ring-2 dark:bg-white/5"
                />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full rounded-full bg-purple-600 hover:bg-purple-600/85 text-white font-semibold py-6 transition-all duration-200"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              {t("verify")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Resend Code */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isLoading}
            className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors disabled:opacity-50"
          >
            {t("resendCode")}
          </button>
        </div>
      </form>

      {/* Back to Sign Up */}
      <div className="mt-6 text-center">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToSignUp")}
        </Link>
      </div>
    </div>
  );
}
