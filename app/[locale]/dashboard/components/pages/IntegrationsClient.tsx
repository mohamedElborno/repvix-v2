"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  PlugZap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";

export default function IntegrationsClient() {
  const t = useTranslations("integrations");
  const [subdomain, setSubdomain] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { organization } = useOrganization();

  const convexOrgId = useQuery(
    api.orgs.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const zendeskConnection = useQuery(
    api.zendesk.getConnectionByOrg,
    convexOrgId ? { organizationId: convexOrgId } : "skip"
  );
  const deleteConnection = useMutation(api.zendesk.deleteConnectionByOrg);

  const isQueryLoading =
    convexOrgId === undefined || zendeskConnection === undefined;
  const isConnected = Boolean(zendeskConnection?.subdomain);
  const connectedSubdomain = zendeskConnection?.subdomain;
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const highlights = [
    { icon: Sparkles, text: t("zendesk.points.sync") },
    { icon: ShieldCheck, text: t("zendesk.points.automation") },
    { icon: CheckCircle2, text: t("zendesk.points.insights") },
  ];

  const checklist = [
    t("zendesk.checklist.admin"),
    t("zendesk.checklist.subdomain"),
    t("zendesk.checklist.scopes"),
  ];

  const handleRequestAccess = () => {
    if (isConnected) {
      toast.success(t("zendesk.alreadyConnected"));
      return;
    }
    if (!subdomain.trim()) {
      toast.error(t("zendesk.missingSubdomain"));
      return;
    }
    const target = `/api/integrations/zendesk/authorize?subdomain=${encodeURIComponent(
      subdomain.trim()
    )}`;
    setIsRedirecting(true);
    window.location.href = target;
  };

  const handleDisconnect = async () => {
    if (!convexOrgId) return;
    setIsDisconnecting(true);
    try {
      await deleteConnection({ organizationId: convexOrgId });
      toast.success(t("zendesk.disconnected"));
    } catch (error: any) {
      toast.error(error?.message || t("zendesk.disconnectError"));
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 space-y-8">
      <div className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-wide">
          {t("comingSoon")}
        </Badge>
        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground max-w-3xl">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden border-border">
        <CardHeader className="flex flex-col gap-4 pt-5 border-b bg-muted/40 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-semibold shadow-sm">
              <Image
                src="/Zendesk.svg"
                alt="Zendesk"
                width={500}
                height={500}
                className="h-6 w-auto shrink-0 transition-opacity ease-in-out duration-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{t("zendesk.title")}</CardTitle>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {isQueryLoading
                    ? t("zendesk.checking")
                    : isConnected
                      ? t("zendesk.connected")
                      : t("zendesk.status")}
                </Badge>
              </div>
              <CardDescription>{t("zendesk.description")}</CardDescription>
            </div>
          </div>
          {isQueryLoading ? (
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex items-center gap-2">
                <Button type="button" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("zendesk.checking")}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground md:text-right">
                {t("zendesk.checking")}
              </div>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDisconnect}
                  className="gap-2 cursor-pointer bg-destructive/70 hover:bg-destructive/90 text-white shadow-lg shadow-destructive/30"
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  {isDisconnecting
                    ? t("zendesk.disconnecting")
                    : t("zendesk.disconnect")}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground md:text-right">
                {connectedSubdomain
                  ? t("zendesk.connectedTo", { subdomain: connectedSubdomain })
                  : t("zendesk.connected")}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:items-end">
              <div className="w-full md:w-72 space-y-2">
                <Label htmlFor="zd-subdomain" className="text-sm font-medium">
                  {t("zendesk.subdomainLabel")}
                </Label>
                <Input
                  id="zd-subdomain"
                  placeholder="acme"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("zendesk.subdomainHint")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {t("zendesk.status")}
                </Badge>
                <Button
                  type="button"
                  onClick={handleRequestAccess}
                  className="gap-2 cursor-pointer text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-30"
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  {isRedirecting ? t("zendesk.redirecting") : t("zendesk.cta")}
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="grid gap-3 p-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm"
                >
                  <item.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("comingSoon")}
      </div>
    </div>
  );
}
