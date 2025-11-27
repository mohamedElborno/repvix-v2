// src/lib/chat/prompts/chat_analysis_prompt_es.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * Spanish system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in Spanish.
 */
export const CHAT_ANALYSIS_PROMPT_ES =
  `
Debes escribir todos los campos de texto (resúmenes, notas, descripciones, títulos)
del JSON en ESPAÑOL, con un tono profesional, claro y directo,
adecuado para responsables de atención al cliente / ventas o freelancers expertos.

Evita el relleno y céntrate en análisis prácticos y recomendaciones accionables.

` + BASE_CHAT_ANALYSIS_PROMPT;
