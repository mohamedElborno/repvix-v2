// src/lib/chat/prompts/chat_analysis_prompt_tr.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * Turkish system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in Turkish.
 */
export const CHAT_ANALYSIS_PROMPT_TR =
  `
JSON çıktısındaki tüm doğal dil alanlarını (özetler, notlar, açıklamalar, başlıklar)
TÜRKÇE yazmalısın. Üslup; profesyonel, net ve müşteri hizmetleri / satış yöneticileri
ve serbest çalışan uzmanlar için uygun olmalıdır.

Gereksiz süslemelerden kaçın, pratik analiz ve uygulanabilir önerilere odaklan.

` + BASE_CHAT_ANALYSIS_PROMPT;
