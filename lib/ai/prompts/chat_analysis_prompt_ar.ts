// src/lib/chat/prompts/chat_analysis_prompt_ar.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * Arabic system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in Modern Standard Arabic.
 */
export const CHAT_ANALYSIS_PROMPT_AR =
  `
يجب أن تكتب جميع الحقول النصية (summaries, notes, descriptions, titles, actions)
داخل مخرجات JSON باللغة العربية الفصحى الحديثة، بأسلوب مهني وواضح ومباشر،
مناسب لمدير خدمة عملاء أو مدير مبيعات أو مستقل محترف يقوم بمراجعة المحادثة.

تجنّب الحشو والمبالغة، وركّز على التحليل العملي والتوصيات القابلة للتنفيذ.

` + BASE_CHAT_ANALYSIS_PROMPT;
