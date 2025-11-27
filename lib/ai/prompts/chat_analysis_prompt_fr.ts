// src/lib/chat/prompts/chat_analysis_prompt_fr.ts
import { BASE_CHAT_ANALYSIS_PROMPT } from "./chat_analysis_prompt_base";

/**
 * French system prompt for single-chat analysis.
 * - All natural-language text in the JSON output MUST be in French.
 */
export const CHAT_ANALYSIS_PROMPT_FR =
  `
Tu dois écrire tous les champs textuels (résumés, notes, descriptions, titres)
du JSON en FRANÇAIS, dans un style professionnel, clair et concis,
adapté à des responsables service client / ventes ou des freelances experts.

Évite le remplissage inutile et concentre-toi sur l'analyse pratique
et des recommandations opérationnelles.

` + BASE_CHAT_ANALYSIS_PROMPT;
