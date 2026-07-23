export const EVALUATOR_KINDS = ["deterministic", "model", "human"] as const;

export type EvaluatorKind = (typeof EVALUATOR_KINDS)[number];
