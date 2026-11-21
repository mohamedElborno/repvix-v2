export function requireServerBridge(provided: string) {
  const expected = process.env.CONVEX_SERVER_BRIDGE_SECRET;
  if (!expected || expected.length < 32 || provided.length !== expected.length) throw new Error("Unauthorized server request");
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  if (difference !== 0) throw new Error("Unauthorized server request");
}
