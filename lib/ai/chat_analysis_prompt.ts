// src/lib/chat/prompts/chat_analysis_prompt.ts
import type { AiSupportedLanguage } from "../ai/aiTypes";
import { CHAT_ANALYSIS_PROMPT_EN } from "./prompts/chat_analysis_prompt_en";
import { CHAT_ANALYSIS_PROMPT_AR } from "./prompts/chat_analysis_prompt_ar";
import { CHAT_ANALYSIS_PROMPT_TR } from "./prompts/chat_analysis_prompt_tr";
import { CHAT_ANALYSIS_PROMPT_FR } from "./prompts/chat_analysis_prompt_fr";
import { CHAT_ANALYSIS_PROMPT_ES } from "./prompts/chat_analysis_prompt_es";
import { CHAT_ANALYSIS_PROMPT_HI } from "./prompts/chat_analysis_prompt_hi";

export function getChatAnalysisSystemPrompt(
  analysisLanguage: AiSupportedLanguage
): string {
  switch (analysisLanguage) {
    case "ar":
      return CHAT_ANALYSIS_PROMPT_AR;
    case "en":
      return CHAT_ANALYSIS_PROMPT_EN;
    case "tr":
      return CHAT_ANALYSIS_PROMPT_TR;
    case "fr":
      return CHAT_ANALYSIS_PROMPT_FR;
    case "es":
      return CHAT_ANALYSIS_PROMPT_ES;
    case "hi":
      return CHAT_ANALYSIS_PROMPT_HI;
    default:
      return CHAT_ANALYSIS_PROMPT_EN;
  }
}
