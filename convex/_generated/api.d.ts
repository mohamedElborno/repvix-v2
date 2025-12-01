/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chatAnalysis from "../chatAnalysis.js";
import type * as chatAnalysisData from "../chatAnalysisData.js";
import type * as chats from "../chats.js";
import type * as globalAnalysis from "../globalAnalysis.js";
import type * as globalChatAnalysis from "../globalChatAnalysis.js";
import type * as lib_plans from "../lib/plans.js";
import type * as messages from "../messages.js";
import type * as orgMembers from "../orgMembers.js";
import type * as orgs from "../orgs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chatAnalysis: typeof chatAnalysis;
  chatAnalysisData: typeof chatAnalysisData;
  chats: typeof chats;
  globalAnalysis: typeof globalAnalysis;
  globalChatAnalysis: typeof globalChatAnalysis;
  "lib/plans": typeof lib_plans;
  messages: typeof messages;
  orgMembers: typeof orgMembers;
  orgs: typeof orgs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
