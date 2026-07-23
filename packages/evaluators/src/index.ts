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
export type {
  BuilderArtifacts,
  BuilderIntent,
  PackModelData,
} from "./model/builder.js";
export { buildModelRequests } from "./model/builder.js";
export type { ModelRunOptions } from "./model/evaluate.js";
export { runModelEvaluation } from "./model/evaluate.js";
export { MODEL_RESPONSE_SCHEMA } from "./model/response-schema.js";
export type {
  ModelEvaluationRequest,
  ModelImage,
  ModelImagePurpose,
  ModelResponse,
  ProviderTransport,
} from "./model/transport.js";
