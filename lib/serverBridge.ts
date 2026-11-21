import "server-only";
export function serverBridgeSecret() {
  const secret = process.env.CONVEX_SERVER_BRIDGE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Server bridge is not configured");
  return secret;
}
