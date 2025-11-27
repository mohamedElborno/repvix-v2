// src/lib/openai/client.ts
import OpenAI from "openai";

/**
 * نموذج التحليل الافتراضي لمحادثة واحدة.
 * يمكنك تغييره من الـ env إذا أحببت.
 */
export const CHAT_ANALYSIS_MODEL =
  process.env.CHAT_ANALYSIS_MODEL || "gpt-5-mini-2025-08-07";

/**
 * نستخدم Singleton بسيط حتى لا ننشئ Client في كل استدعاء.
 */
let _client: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    _client = new OpenAI({ apiKey });
  }

  return _client;
}
