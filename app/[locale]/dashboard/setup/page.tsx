"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  MessageSquare,
} from "lucide-react";
import { createOrganizationAction } from "../my-team/[memberConvexId]/actions";

type SetupStatus = "checking" | "creating" | "activating" | "done" | "error";

export default function SetupPage() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList();
  const router = useRouter();

  const creationStarted = useRef(false);
  const [status, setStatus] = useState<SetupStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const activateAndContinue = useCallback(
    async (organizationId?: string | null) => {
      if (!organizationId || !setActive) {
        router.push("/dashboard");
        return;
      }

      setStatus("activating");
      try {
        await setActive({ organization: organizationId });
      } finally {
        router.push("/dashboard");
      }
    },
    [router, setActive]
  );

  const startCreation = useCallback(async () => {
    setStatus("creating");
    setError(null);

    try {
      const result = await createOrganizationAction("my-team");
      if (result?.organizationId) {
        await activateAndContinue(result.organizationId);
      } else {
        throw new Error("Failed to create organization");
      }
    } catch (err: any) {
      creationStarted.current = false;
      setStatus("error");
      setError(err?.message || "Failed to prepare your workspace.");
    }
  }, [activateAndContinue]);

  useEffect(() => {
    if (!isLoaded || userMemberships.data === undefined) return;

    // Invited users already belong to an org: activate and go to dashboard
    if (userMemberships.data.length > 0) {
      const firstOrgId = userMemberships.data?.[0]?.organization?.id;
      void activateAndContinue(firstOrgId);
      return;
    }

    // No orgs yet: create a default one once
    if (creationStarted.current) return;
    creationStarted.current = true;
    void startCreation();
  }, [activateAndContinue, isLoaded, startCreation, userMemberships.data]);

  const isBusy =
    status === "checking" ||
    status === "creating" ||
    status === "activating" ||
    status === "done";

  const statusLabel: Record<SetupStatus, string> = {
    checking: "جارٍ التحقق من حسابك...",
    creating: "نجهز مؤسستك الآن...",
    activating: "نفعل مساحة العمل الخاصة بك...",
    done: "تم الإعداد، سيتم توجيهك...",
    error: "تعذر إكمال الإعداد",
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6 shadow-lg">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">تجهيز مساحتك</h1>
          <p className="text-muted-foreground">
            ننشئ فريقك الافتراضي باسم "my-team" تلقائياً حتى تبدأ فوراً.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {isBusy ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="font-medium">{statusLabel[status]}</p>
              <p className="text-sm text-muted-foreground text-center">
                يستغرق الإعداد بضع ثوانٍ. لا حاجة لأي خطوة يدوية.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-destructive">
                {statusLabel[status]}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                حدث خطأ أثناء إنشاء المساحة. جرّب إعادة المحاولة.
              </p>
              <Button
                onClick={() => {
                  creationStarted.current = true;
                  void startCreation();
                }}
              >
                إعادة المحاولة
              </Button>
              {error && (
                <p className="text-xs text-muted-foreground text-center">
                  التفاصيل: {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">دعوة الفريق</p>
              <p className="text-sm text-muted-foreground">
                أرسل الدعوات لزملائك للعمل معاً في نفس المساحة.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">ارفع ملفاتك</p>
              <p className="text-sm text-muted-foreground">
                ابدأ برفع ملفات العمل لتحصل على تحليلات ومحادثات أذكى.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">صلاحيات آمنة</p>
              <p className="text-sm text-muted-foreground">
                نضبط الأدوار تلقائياً، ويمكنك تعديلها من قسم الفريق لاحقاً.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

