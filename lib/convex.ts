// lib/convex.ts
import { ConvexHttpClient } from "convex/browser";
import type { ConvexReactClient } from "convex/react";

/**
 * ============================================
 * Convex Server Client (Server Components)
 * ============================================
 * يستخدم داخل الملفات:
 * - layout.tsx
 * - server actions
 * - أي component يعمل على السيرفر
 */
let serverClient: ConvexHttpClient | null = null;

export function getConvexServerClient() {
  if (!serverClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing.");

    serverClient = new ConvexHttpClient(url);
  }
  return serverClient;
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
