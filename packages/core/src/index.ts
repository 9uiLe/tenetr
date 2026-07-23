export const HARNESS_VERSION = "0.1.0";

export type {
  ResolveFailure,
  ResolveOutcome,
  TaskDefinition,
  TaskOpenQuestion,
} from "./intent/resolve.js";
export { resolveIntent } from "./intent/resolve.js";
export type {
  ValidationIssue,
  ValidationResult,
  ValidationStage,
} from "./pack/validate.js";
export { stageOrder, validatePack } from "./pack/validate.js";
