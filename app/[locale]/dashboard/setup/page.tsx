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
import { trackSafe } from "@/lib/metaPixel";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";

type SetupStatus = "checking" | "creating" | "activating" | "done" | "error";

export default function SetupPage() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList();
  const router = useRouter();
  const t = useTranslations("dashboard.setup");
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();

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

  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || !user?.id) return;

    const createdAtMs = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const isFresh = createdAtMs && Date.now() - createdAtMs < 10 * 60 * 1000; // 10 دقائق
    if (!isFresh) return;

    const key = `px_complete_registration:${user.id}`;
    if (localStorage.getItem(key)) return;

    const eventID =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    void trackSafe("CompleteRegistration", {}, { eventID });
    localStorage.setItem(key, eventID);
  }, [isUserLoaded, isSignedIn, user?.id, user?.createdAt]);

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
      setError(err?.message || t("status.error"));
    }
  }, [activateAndContinue, t]);

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
    checking: t("status.checking"),
    creating: t("status.creating"),
    activating: t("status.activating"),
    done: t("status.done"),
    error: t("status.error"),
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {isBusy ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="font-medium">{statusLabel[status]}</p>
              <p className="text-sm text-muted-foreground text-center">
                {t("waitingMessage")}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-destructive">
                {statusLabel[status]}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {t("errorMessage")}
              </p>
              <Button
                onClick={() => {
                  creationStarted.current = true;
                  void startCreation();
                }}
              >
                {t("retry")}
              </Button>
              {error && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("details")} {error}
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
              <p className="font-medium">{t("features.inviteTeam.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("features.inviteTeam.description")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">{t("features.uploadFiles.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("features.uploadFiles.description")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">
                {t("features.securePermissions.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("features.securePermissions.description")}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
