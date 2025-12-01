/* ----------------------------- NORMALIZED MESSAGE TYPE ----------------------------- */
export type NormalizedMessage = {
  senderType: "customer" | "agent" | "system"; // Who is the sender?
  senderName?: string; // The name of the customer / employee if found
  textRaw: string; // The raw text as it came from the source
  textClean: string; // The clean text ready to be sent to GPT
  language?: string; // "ar" | "en" | "tr" ... (optional for now)
  externalMessageId?: string; // If it came from WhatsApp, Intercom, etc.
  externalTimestamp?: number; // timestamp from the source if it exists
  internalTimestamp: number; // Date.now() or internal order
  metadata?: Record<string, any>; // Any additional fields specific to the integration
};
/* ----------------------------- CREATE CHAT PAYLOAD TYPE ----------------------------- */
export type CreateChatPayload = {
  organizationId: string; // Convex Id<"organizations"> as string
  createdByUserId: string; // clerk user id of the user who created the chat
  title?: string; // The title of the chat if you want
  employeeMemberId?: string; // The organization member (if we want to link it to a specific employee)
  channel?: string; // "whatsapp" | "telegram" | "manual" | ...
  customerIdentifier?: string; // The customer identifier / username / email...
  customerName?: string; // The name of the customer if you want
  messages: NormalizedMessage[]; // The messages after normalization
};
