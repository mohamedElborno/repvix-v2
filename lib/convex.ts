import { ConvexHttpClient } from "convex/browser";

let serverClient: ConvexHttpClient | null = null;

export function getConvexServerClient() {
  if (!serverClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing.");
    serverClient = new ConvexHttpClient(url);
  }
  return serverClient;
}
