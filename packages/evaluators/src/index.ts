export const EVALUATOR_KINDS = ["deterministic", "model", "human"] as const;

export type EvaluatorKind = (typeof EVALUATOR_KINDS)[number];

export type { GateDecision } from "./aggregate.js";
export { buildEvaluation, gateDecision } from "./aggregate.js";
export type {
  CaptureManifestData,
  DeterministicEvaluator,
  EvaluationContext,
  Finding,
  FlatElement,
} from "./context.js";
export { flattenElements } from "./context.js";
export {
  accessibilityLabelEvaluator,
  tapTargetEvaluator,
} from "./deterministic/accessibility.js";
export {
  artifactPresenceEvaluator,
  primaryControlCountEvaluator,
  primaryStyleDistinctEvaluator,
  requiredElementsEvaluator,
} from "./deterministic/metadata.js";
