// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware((auth, request) => {
  const { pathname } = request.nextUrl;

  // ✅ 1) لا تلمس أي شيء تحت /api (ومن ضمنه /api/webhooks/clerk)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ✅ 2) باقي المسارات تستخدم next-intl كالعادة
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
