import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { eczar, whyteInktrap } from "@/lib/fonts";
import { Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import "../globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { Analytics } from "@vercel/analytics/next";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-sans-arabic",
});

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
    authors: [{ name: "Repvix Team" }, { name: "Mohamed Elborno" }],
    creator: "Mohamed Elborno",
    publisher: "Repvix",
    openGraph: {
      type: "website",
      title: t("title"),
      description: t("description"),
      url: defaultUrl,
      siteName: "Repvix",
      images: [
        {
          url: "/Repvix.png",
          width: 1200,
          height: 630,
          alt: "Repvix AI Chat Analysis Dashboard Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/Repvix.png"],
      creator: "@repvix",
    },
    alternates: {
      canonical: defaultUrl,
      languages: {
        en: `${defaultUrl}/en`,
        ar: `${defaultUrl}/ar`,
        fr: `${defaultUrl}/fr`,
        tr: `${defaultUrl}/tr`,
        es: `${defaultUrl}/es`,
        hi: `${defaultUrl}/hi`,
      },
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: "/logo.png",
      shortcut: "/logo.png",
      apple: "/logo.png",
    },
  };
}

export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor: "#6b46c1",
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
        <head>
          <link rel="manifest" href="/manifest.json" />
          <script type="application/ld+json">
            {`
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Repvix",
  "operatingSystem": "Web",
  "applicationCategory": "BusinessApplication",
  "description": "Repvix analyzes customer support and sales chats using AI to deliver performance insights, sentiment analytics, and multilingual reports.",
  "url": "https://repvix.com",
  "image": "https://repvix.com/Repvix.png",
  "author": {
    "@type": "Person",
    "name": "Mohamed Elborno"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Repvix"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
`}
          </script>
        </head>
        <body
          className={`${
            locale === "ar"
              ? notoSansArabic.className
              : locale === "hi"
                ? eczar.className
                : locale === "en"
                  ? whyteInktrap.className
                  : "font-sans"
          } antialiased bg-background text-foreground`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
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
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
