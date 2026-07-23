import type { EvaluationResult } from "@tenetr/spec";
import type { Finding } from "./context.js";

export function buildEvaluation(
  runId: string,
  findings: Finding[],
): EvaluationResult {
  const deterministic = findings.filter((f) => f.kind === "deterministic");
  const model = findings.filter((f) => f.kind === "model");
  const summary = {
    deterministic: {
      pass: deterministic.filter((f) => f.verdict === "pass").length,
      fail: deterministic.filter((f) => f.verdict === "fail").length,
      unknown: deterministic.filter((f) => f.verdict === "unknown").length,
    },
    model: {
      pass: model.filter((f) => f.verdict === "pass").length,
      warn: model.filter((f) => f.verdict === "warn").length,
      unknown: model.filter((f) => f.verdict === "unknown").length,
    },
    human_review: findings.filter((f) => f.verdict === "human_review").length,
  };
  return {
    schema_version: "1.0",
    run_id: runId,
    summary,
    findings,
  } as EvaluationResult;
}

export interface GateDecision {
  pass: boolean;
  blockingFindings: Finding[];
}

// §13.2: CI を停止できるのは Deterministic Fail のみ。model/human はどの verdict でも gate を通す。
export function gateDecision(findings: Finding[]): GateDecision {
  const blocking = findings.filter(
    (f) => f.kind === "deterministic" && f.verdict === "fail",
  );
  return { pass: blocking.length === 0, blockingFindings: blocking };
}
