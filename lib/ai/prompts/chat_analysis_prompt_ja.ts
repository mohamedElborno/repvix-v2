// src/lib/chat/prompts/chat_analysis_prompt_en.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * Japanese system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in Japanese.
 */
export const CHAT_ANALYSIS_PROMPT_JA =
  `
あなたは、JSON出力内のすべての自然言語テキストフィールドを**日本語**で記述しなければなりません。
管理者および上級専門家（シニアIC）に適した、明確でプロフェッショナルなトーンを使用してください。

` + BASE_CHAT_ANALYSIS_PROMPT;
