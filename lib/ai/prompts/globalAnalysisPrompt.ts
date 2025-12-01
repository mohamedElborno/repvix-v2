import type { AiSupportedLanguage } from "../../ai/aiTypes";
import { GLOBAL_ANALYSIS_PROMPT_AR } from "./global_analysis_prompt_ar";
import { GLOBAL_ANALYSIS_PROMPT_EN } from "./global_analysis_prompt_en";
import { GLOBAL_ANALYSIS_PROMPT_TR } from "./global_analysis_prompt_tr";
import { GLOBAL_ANALYSIS_PROMPT_FR } from "./global_analysis_prompt_fr";
import { GLOBAL_ANALYSIS_PROMPT_ES } from "./global_analysis_prompt_es";
import { GLOBAL_ANALYSIS_PROMPT_HI } from "./global_analysis_prompt_hi";

export function getGlobalAnalysisSystemPrompt(
  language: AiSupportedLanguage
): string {
  switch (language) {
    case "ar":
      return GLOBAL_ANALYSIS_PROMPT_AR;
    case "en":
      return GLOBAL_ANALYSIS_PROMPT_EN;
    case "tr":
      return GLOBAL_ANALYSIS_PROMPT_TR;
    case "fr":
      return GLOBAL_ANALYSIS_PROMPT_FR;
    case "es":
      return GLOBAL_ANALYSIS_PROMPT_ES;
    case "hi":
      return GLOBAL_ANALYSIS_PROMPT_HI;
    default:
      return GLOBAL_ANALYSIS_PROMPT_EN;
  }
}
