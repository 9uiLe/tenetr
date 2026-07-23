import type { DesignIntentContract, EvaluationResult } from "@tenetr/spec";

export interface CaptureManifestForReport {
  scenario: string;
  profile?: string;
  environment?: Record<string, string>;
  source?: { tool: string; tool_version?: string };
  artifacts: { path: string; sha256: string }[];
}

export interface ReportVersions {
  harness: string;
  philosophy_pack?: string;
  rubric?: string;
}

export interface ReportImages {
  after?: { mimeType: string; base64: string };
  before?: { mimeType: string; base64: string };
}

export interface ReportData {
  run_id: string;
  intent: DesignIntentContract;
  evaluation: EvaluationResult;
  capture: CaptureManifestForReport;
  versions: ReportVersions;
  images: ReportImages;
}

const VERDICT_PRIORITY: Record<string, number> = {
  fail: 0,
  human_review: 1,
  warn: 2,
  unknown: 3,
  pass: 4,
};

export function sortFindingsForDisplay(
  findings: EvaluationResult["findings"],
): EvaluationResult["findings"] {
  return [...findings].sort(
    (a, b) =>
      (VERDICT_PRIORITY[a.verdict] ?? 9) - (VERDICT_PRIORITY[b.verdict] ?? 9),
  );
}

export function buildJsonReport(data: ReportData): Record<string, unknown> {
  return {
    schema_version: "1.0",
    run_id: data.run_id,
    task: data.intent.task,
    design_intent: data.intent,
    applicable_principles: data.intent.applicable_principles,
    summary: data.evaluation.summary,
    findings: sortFindingsForDisplay(data.evaluation.findings),
    reproduction: {
      scenario: data.capture.scenario,
      environment: data.capture.environment ?? {},
      capture_tool: data.capture.source,
    },
    artifacts: data.capture.artifacts,
    versions: data.versions,
  };
}
