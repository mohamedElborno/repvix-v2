"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function LoginForm() {
  const t = useTranslations("login");
  const locale = useLocale();
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: formData.identifier,
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success(t("signInSuccess") || "Signed in successfully!");
        router.push("/dashboard");
      } else {
        // Handle additional steps (e.g., email verification code)
        const emailFactor = result.supportedFirstFactors?.find(
          (f: any) => f.strategy === "email_code"
        );

        if (result.status === "needs_first_factor" && emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: (emailFactor as any).emailAddressId,
          });
          setAwaitingCode(true);
          toast.success(
            t("checkEmailCode") || "We sent you a verification code by email."
          );
        } else {
          toast.error(
            t("additionalStepsRequired") || "Additional steps required"
          );
        }
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || t("errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google") => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      // Build the redirect URL with locale
      const redirectUrl = `${window.location.origin}/${locale}/dashboard`;
      const redirectUrlComplete = `${window.location.origin}/${locale}/dashboard`;

      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || t("errorOccurred"));
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsVerifying(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        toast.success(t("signInSuccess") || "Signed in successfully!");
        router.push("/dashboard");
      } else {
        toast.error(
          t("additionalStepsRequired") || "Additional steps required"
        );
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || t("errorOccurred"));
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      {/* Clerk CAPTCHA Element */}
      <div id="clerk-captcha" />

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-linear-to-b from-white to-white/80 mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-white/70">{t("subtitle")}</p>
      </div>

      {/* Social Sign-in Buttons*/}
      <div className="space-y-3 mb-6">
        <Button
          type="button"
          onClick={() => handleSocialSignIn("google")}
          disabled={isLoading}
          className="w-full rounded-full bg-white text-black hover:bg-white/90 transition-all duration-200 font-semibold py-6"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("continueWithGoogle")}
        </Button>
        {/* 
        <Button
          type="button"
          onClick={() => handleSocialSignIn("slack")}
          disabled={isLoading}
          className="w-full rounded-full bg-white text-black hover:bg-white/90 transition-all duration-200 font-semibold py-6"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 18.956 0a2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522zM18.956 6.313a2.528 2.528 0 0 1 2.522 2.521 2.528 2.528 0 0 1-2.522 2.521h-6.313A2.528 2.528 0 0 1 10.121 8.834a2.528 2.528 0 0 1 2.522-2.521h6.313zM13.646 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 13.646 24a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52zM13.646 17.685a2.528 2.528 0 0 1-2.52-2.521 2.528 2.528 0 0 1 2.52-2.521h6.313A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
          </svg>
          {t("continueWithSlack")}
        </Button> */}
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/5 px-2 text-white/60">{t("or")}</span>
        </div>
      </div>

      {/* Email/Username Sign-in Form OR Code Verification */}
      {awaitingCode ? (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-xs font-medium text-white/70 mb-2"
            >
              {t("verificationCode") || "Verification code"}
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={
                t("verificationCodePlaceholder") ||
                "Enter the code sent to your email"
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
          <Button
            type="submit"
            disabled={isVerifying}
            className="w-full rounded-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-6 transition-all duration-200 mt-6"
          >
            {isVerifying ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          {/* Email/Username or Phone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="identifier"
                className="block text-xs font-medium text-white/70"
              >
                {usePhone ? t("phoneNumber") : t("emailOrUsername")}
              </label>
              <button
                type="button"
                onClick={() => setUsePhone(!usePhone)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {usePhone ? t("useEmail") : t("usePhone")}
              </button>
            </div>
            <input
              id="identifier"
              name="identifier"
              type={usePhone ? "tel" : "text"}
              required
              value={formData.identifier}
              onChange={handleInputChange}
              placeholder={
                usePhone
                  ? t("phonePlaceholder")
                  : t("emailOrUsernamePlaceholder")
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-white/70 mb-2"
            >
              {t("password")}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t("passwordPlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              {t("forgotPassword")}
            </a>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-6 transition-all duration-200 mt-6"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Sign Up Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-white/60">
          {t("dontHaveAccount")}{" "}
          <a
            href="/sign-up"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            {t("signUp")}
          </a>
        </p>
      </div>
    </div>
  );
}
