import type { ValidationStage } from "@tenetr/core";

// §10.2 の exit code 契約の唯一の定義点 (ADR-0001 拘束2)。
// commander や個別 handler に exit 判定を分散させない。
export const EXIT_CODES = {
  valid: 0,
  schemaViolation: 1,
  brokenReference: 2,
  semanticContradiction: 3,
  environmentError: 4,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

const STAGE_TO_EXIT: Record<ValidationStage, ExitCode> = {
  environment: EXIT_CODES.environmentError,
  schema: EXIT_CODES.schemaViolation,
  reference: EXIT_CODES.brokenReference,
  semantic: EXIT_CODES.semanticContradiction,
};

export function exitCodeForFailedStage(stage: ValidationStage): ExitCode {
  return STAGE_TO_EXIT[stage];
}
