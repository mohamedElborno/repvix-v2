// src/lib/chat/prompts/chat_analysis_prompt_en.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * English system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in English.
 */
export const CHAT_ANALYSIS_PROMPT_EN =
  `
You MUST write all natural-language text fields in the JSON output in ENGLISH.
Use a clear, professional tone suitable for managers and senior individual contributors.

` + BASE_CHAT_ANALYSIS_PROMPT;
