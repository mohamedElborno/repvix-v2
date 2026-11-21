/** Short-lived account-scoped tokens issued by a trusted Zendesk app backend. */
export async function verifyZendeskRequest(request: Request, subdomain: string): Promise<boolean> {
  try {
    const secret = process.env.ZENDESK_APP_SIGNING_SECRET;
    if (!secret || secret.length < 32) return false;
    const authorization = request.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ") || authorization.length > 4096) return false;
    const parts = authorization.slice(7).split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
    const [encoded, signature] = parts;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const bytes = Uint8Array.from(signature.match(/../g)!, h => parseInt(h, 16));
    if (!await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(encoded))) return false;
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    const now = Math.floor(Date.now() / 1000);
    return payload.subdomain === subdomain && payload.aud === "repvix-zendesk" &&
      Number.isSafeInteger(payload.exp) && Number.isSafeInteger(payload.iat) &&
      payload.exp > now && payload.iat <= now + 30 && payload.iat >= now - 300 &&
      payload.exp <= payload.iat + 300 && Array.isArray(payload.paths) &&
      payload.paths.includes(new URL(request.url).pathname);
  } catch { return false; }
}
