// app/api/chats/import/route.ts

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getConvexServerClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

import { normalizeMessages, type RawMessageInput } from "@/lib/chat/normalize";
import { parseWhatsappToRawMessages } from "@/lib/chat/parseWhatsapp";
import { findBestNameMatch } from "@/lib/helper/normalizeNameForMatch";
import { normalizeNameForMatch } from "@/lib/helper/normalizeNameForMatch";

const DEFAULT_LANGUAGE: "ar" | "en" = "ar";

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "No active organization selected" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const title: string = (body?.title || "").trim();
    const rawText: string = (body?.rawText || "").trim();
    const customerName: string = (body?.customerName || "").trim();

    if (!title || !rawText) {
      return NextResponse.json(
        { error: "Title and rawText are required." },
        { status: 400 }
      );
    }

    // Link the org from Clerk to the org in Convex (needed early to get members)
    const convex = await getConvexServerClient();
    const convexOrgId = await convex.query(api.orgs.getByClerkId, {
      clerkOrgId: orgId,
    });

    if (!convexOrgId) {
      return NextResponse.json(
        { error: "Organization not found in Convex." },
        { status: 400 }
      );
    }

    // Get all organization members to use their names as possible agents
    const orgMembers = await convex.query(api.orgs.getOrganizationMembers, {
      clerkOrgId: orgId,
    });

    // Get the user data from Clerk to use the name as a possible agent in WhatsApp
    const clerkUser = await currentUser();

    const possibleAgentNames: string[] = [];

    // Add all organization members' names
    for (const member of orgMembers) {
      if (member.name) {
        possibleAgentNames.push(member.name);
      }
    }

    // Also add Clerk user data as fallback
    if (clerkUser) {
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fullName && !possibleAgentNames.includes(fullName)) {
        possibleAgentNames.push(fullName);
      }

      if (
        clerkUser.username &&
        !possibleAgentNames.includes(clerkUser.username)
      ) {
        possibleAgentNames.push(clerkUser.username);
      }

      const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (primaryEmail) {
        // The name can be written in WhatsApp without the domain
        const localPart = primaryEmail.split("@")[0];
        if (!possibleAgentNames.includes(primaryEmail)) {
          possibleAgentNames.push(primaryEmail);
        }
        if (!possibleAgentNames.includes(localPart)) {
          possibleAgentNames.push(localPart);
        }
      }
    }

    // 1) Try to read it as a WhatsApp chat
    let rawMessages: RawMessageInput[] = [];
    let isWhatsApp = false;

    try {
      const parsed = parseWhatsappToRawMessages(rawText, {
        agentNames: possibleAgentNames,
        defaultSenderType: "customer",
        phoneIsCustomerIfUnknown: true,
        customerNames: customerName ? [customerName] : undefined,
      });

      if (parsed.length > 0) {
        rawMessages = parsed;
        isWhatsApp = true;

        if (customerName) {
          const participants = Array.from(
            new Set(
              rawMessages
                .map((m) => m.senderName || "")
                .filter((name) => !!name)
            )
          );

          const bestCustomerName = findBestNameMatch(
            customerName,
            participants
          );

          if (bestCustomerName) {
            // إذا تم تمرير اسم العميل، نعتبر هذا الاسم هو العميل وكل الباقي موظفين
            const normCustomer = normalizeNameForMatch(bestCustomerName);
            rawMessages = rawMessages.map((m) => {
              const isCustomer =
                m.senderName &&
                normalizeNameForMatch(m.senderName) === normCustomer;
              return {
                ...m,
                senderType: isCustomer ? "customer" : "agent",
              };
            });
          } else {
            // لا يوجد تطابق جيد → نستخدم pass 1 كما هو
            rawMessages = parsed;
          }
        } else {
          // لا يوجد اسم عميل من الفرونت → نستخدم pass 1 كما هو
          rawMessages = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse WhatsApp format, will fallback:", e);
    }

    // 2) If we couldn't identify it as a WhatsApp chat, consider it a manual chat
    if (!rawMessages.length) {
      rawMessages = [
        {
          senderType: "customer",
          senderName: "Customer",
          text: rawText,
          externalTimestamp: Date.now(),
          metadata: {
            source: "manual_paste",
          },
        },
      ];
    }

    // 3) Normalize
    const normalized = normalizeMessages(rawMessages, {
      defaultLanguage: DEFAULT_LANGUAGE,
      detectLanguage: true,
      // Optional: can add a profanity dictionary here later
      profanityDictionary: undefined,
    });

    if (!normalized.length) {
      return NextResponse.json(
        { error: "No valid messages found after normalization." },
        { status: 400 }
      );
    }

    // 4) convexOrgId already obtained above, no need to query again

    // 5) Call the mutation to create the chat + messages
    const result = await convex.mutation(api.chats.createChatWithMessages, {
      organizationId: convexOrgId,
      createdByUserId: userId, // Required: Clerk user ID
      title,

      // Matches the schema:
      sourceType: isWhatsApp ? "integration" : "manual",
      sourceChannel: isWhatsApp ? "whatsapp" : undefined,
      customerIdentifier: undefined,

      messages: normalized.map((m) => ({
        senderType: m.senderType,
        senderName: m.senderName,
        textRaw: m.textRaw,
        textClean: m.textClean,
        language: m.language === "unknown" ? undefined : m.language,
        externalMessageId: m.externalMessageId,
        externalTimestamp: m.externalTimestamp,
        internalTimestamp: m.internalTimestamp,
        metadata: m.metadata,
      })),
    });

    // 6) (Optional) Calculate simple WhatsApp statistics
    let whatsAppStats: any = null;
    if (isWhatsApp) {
      const participants = new Set<string>();
      let systemMessages = 0;
      let regularMessages = 0;

      const messagesPerParticipant: Record<string, number> = {};

      for (const rm of rawMessages) {
        const name = rm.senderName || "Unknown";
        participants.add(name);

        if (
          rm.text.startsWith("<") ||
          rm.text.includes("تم إنشاء هذه المجموعة") ||
          rm.text.includes("added") ||
          rm.text.includes("غيّر صورة المجموعة")
        ) {
          systemMessages++;
        } else {
          regularMessages++;
        }

        messagesPerParticipant[name] = (messagesPerParticipant[name] || 0) + 1;
      }

      const timestamps = normalized
        .map((m) => m.externalTimestamp || m.internalTimestamp)
        .filter(Boolean)
        .sort((a, b) => (a ?? 0) - (b ?? 0));

      const dateRange =
        timestamps.length > 0
          ? {
              start: new Date(timestamps[0]!).toISOString(),
              end: new Date(timestamps[timestamps.length - 1]!).toISOString(),
            }
          : { start: "", end: "" };

      whatsAppStats = {
        totalMessages: normalized.length,
        totalParticipants: participants.size,
        systemMessages,
        regularMessages,
        messagesPerParticipant,
        dateRange,
      };
    }

    return NextResponse.json(
      {
        chatId: result.chatId,
        isWhatsApp,
        whatsAppStats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/chats/import:", error);
    return NextResponse.json(
      {
        error: "Internal server error while importing chat.",
      },
      { status: 500 }
    );
  }
}
