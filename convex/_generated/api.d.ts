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
import type * as billing from "../billing.js";
import type * as billingCheckout from "../billingCheckout.js";
import type * as billingPlan from "../billingPlan.js";
import type * as billingProcessor from "../billingProcessor.js";
import type * as billingRead from "../billingRead.js";
import type * as chatAnalysis from "../chatAnalysis.js";
import type * as chatAnalysisData from "../chatAnalysisData.js";
import type * as chats from "../chats.js";
import type * as crons from "../crons.js";
import type * as faqs from "../faqs.js";
import type * as featureGate from "../featureGate.js";
import type * as feedbacks from "../feedbacks.js";
import type * as globalAnalysis from "../globalAnalysis.js";
import type * as globalChatAnalysis from "../globalChatAnalysis.js";
import type * as http from "../http.js";
import type * as lib_guard from "../lib/guard.js";
import type * as lib_plans from "../lib/plans.js";
import type * as messages from "../messages.js";
import type * as orgMembers from "../orgMembers.js";
import type * as orgs from "../orgs.js";
import type * as subscriptions from "../subscriptions.js";
import type * as zendesk from "../zendesk.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  billing: typeof billing;
  billingCheckout: typeof billingCheckout;
  billingPlan: typeof billingPlan;
  billingProcessor: typeof billingProcessor;
  billingRead: typeof billingRead;
  chatAnalysis: typeof chatAnalysis;
  chatAnalysisData: typeof chatAnalysisData;
  chats: typeof chats;
  crons: typeof crons;
  faqs: typeof faqs;
  featureGate: typeof featureGate;
  feedbacks: typeof feedbacks;
  globalAnalysis: typeof globalAnalysis;
  globalChatAnalysis: typeof globalChatAnalysis;
  http: typeof http;
  "lib/guard": typeof lib_guard;
  "lib/plans": typeof lib_plans;
  messages: typeof messages;
  orgMembers: typeof orgMembers;
  orgs: typeof orgs;
  subscriptions: typeof subscriptions;
  zendesk: typeof zendesk;
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
