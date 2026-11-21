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
import { META_PIXEL_ID } from "@/lib/metaPixel";
import Script from "next/script";

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
          url: "/demo-preview.svg",
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
      images: ["/demo-preview.svg"],
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
      icon: "/Repvix.svg",
      shortcut: "/Repvix.svg",
      apple: "/Repvix.svg",
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
  "image": "https://repvix.com/demo-preview.svg",
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
          {/* Meta Pixel Base Code */}
          {META_PIXEL_ID ? (
            <>
              <Script id="meta-pixel" strategy="afterInteractive">
                {`
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${META_PIXEL_ID}');
                  fbq('track', 'PageView');
                `}
              </Script>
              <noscript>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                  alt=""
                />
              </noscript>
            </>
          ) : null}
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
