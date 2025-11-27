// src/lib/chat/prompts/chat_analysis_prompt_hi.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * Hindi system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in Hindi.
 */
export const CHAT_ANALYSIS_PROMPT_HI =
  `
JSON आउटपुट के सभी नैचुरल-लैंग्वेज फ़ील्ड (summaries, notes, descriptions, titles)
हिंदी में लिखने हैं। शैली पेशेवर, स्पष्ट और सीधी होनी चाहिए,
ताकि ग्राहक सेवा / सेल्स मैनेजर और अनुभवी फ्रीलांसर आसानी से فهم सकें।

फ़ालतू बातों से बचें और व्यावहारिक विश्लेषण व लागू होने योग्य सुझावों पर ध्यान दें।

` + BASE_CHAT_ANALYSIS_PROMPT;
