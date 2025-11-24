// lib/convex.ts
import { ConvexHttpClient } from "convex/browser";
import type { ConvexReactClient } from "convex/react";
import { auth } from "@clerk/nextjs/server";

/**
 * ============================================
 * Convex Server Client (Server Components)
 * ============================================
 * يستخدم داخل الملفات:
 * - layout.tsx
 * - server actions
 * - أي component يعمل على السيرفر
 *
 * ⚠️ هذا العميل يمرر token المستخدم من Clerk تلقائياً
 *
 * @param skipAuth - إذا كان true، لن يتم تمرير token المستخدم (مفيد للـ webhooks)
 */
export async function getConvexServerClient(skipAuth = false) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing.");

  // إنشاء عميل جديد (لا نستخدم singleton لأن كل طلب يحتاج token مختلف)
  const client = new ConvexHttpClient(url);

  // جلب token المستخدم من Clerk (فقط إذا لم يتم تخطي المصادقة)
  if (!skipAuth) {
    try {
      const { getToken } = await auth();
      const token = await getToken({ template: "convex" });

      // تعيين token المستخدم
      if (token) {
        client.setAuth(token);
      }
    } catch (error) {
      // إذا فشل جلب token، نتابع بدون token
      console.warn("Failed to get auth token, continuing without auth:", error);
    }
  }

  return client;
}

/**
 * ============================================
 * Convex Client (Client Components)
 * ============================================
 * يستخدم فقط داخل:
 * - useQuery()
 * - useMutation()
 * - أي Client Component
 *
 * ⚠️ لا تستخدم هذا في Server Components!
 * استخدم getConvexServerClient() بدلاً منه.
 */
let browserClient: ConvexReactClient | null = null;

export function getConvexClient() {
  if (!browserClient) {
    // Lazy import to avoid loading React Context in server components
    // This will only be executed in client-side code
    if (typeof window === "undefined") {
      throw new Error(
        "getConvexClient() can only be used in client components. Use getConvexServerClient() in server components."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConvexReactClient } = require("convex/react");
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing.");

    browserClient = new ConvexReactClient(url);
  }
  return browserClient;
}
