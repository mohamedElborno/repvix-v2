import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { almarai } from "@/lib/fonts";
import { Toaster } from "sonner";
import "../globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

const defaultUrl = process.env.VERCEL_URL
  ? `https://repvix.com`
  : "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(defaultUrl),
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    authors: [{ name: "Repvix Team" }],
    creator: "Repvix",
    publisher: "Repvix",
    openGraph: {
      type: "website",
      locale: locale,
      url: defaultUrl,
      title: t("title"),
      description: t("description"),
      siteName: "Repvix",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Repvix - AI-Powered Chat Analytics",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/logo.png"],
      creator: "@repvix",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/logo.png",
      shortcut: "/logo.png",
      apple: "/logo.png",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Load messages for the locale
  const messages = (await import(`../../locales/${locale}.json`)).default;

  return (
    <ClerkProvider>
      <html lang={locale} suppressHydrationWarning>
        <body
          className={`${
            locale === "ar" ? almarai.className : "font-sans"
          } antialiased bg-black`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ConvexClientProvider>
                <div dir={locale === "ar" ? "rtl" : "ltr"}>{children}</div>
                <Toaster position="top-right" richColors />
              </ConvexClientProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
