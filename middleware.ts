// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl;

  // ✅ 1. استثناء الملفات الثابتة تمامًا (يشمل sitemap, robots, manifest)
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/sitemap" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // ✅ 2. استثناء API وملفات Next.js
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // ✅ 3. تمرير باقي الطلبات إلى next-intl
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    // الصفحات العادية (مع Clerk + intl)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    // ✅ API/TRPC فقط لـ Clerk (بدون intl لأننا أوقفناه في الكود أعلاه)
    "/(api|trpc)(.*)",
  ],
};
