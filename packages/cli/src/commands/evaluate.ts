import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  loadScenarios,
  validateEvaluationDocument,
  validatePack,
} from "@tenetr/core";
import type { EvaluationContext } from "@tenetr/evaluators";
import {
  accessibilityLabelEvaluator,
  artifactPresenceEvaluator,
  buildEvaluation,
  gateDecision,
  primaryControlCountEvaluator,
  primaryStyleDistinctEvaluator,
  requiredElementsEvaluator,
  tapTargetEvaluator,
} from "@tenetr/evaluators";
import type { DesignIntentContract, UISnapshot } from "@tenetr/spec";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES, exitCodeForFailedStage } from "../exit-codes.js";
import type { CliIo } from "../io.js";

const DETERMINISTIC_EVALUATORS = [
  artifactPresenceEvaluator,
  primaryControlCountEvaluator,
  primaryStyleDistinctEvaluator,
  requiredElementsEvaluator,
  accessibilityLabelEvaluator,
  tapTargetEvaluator,
];

export function runEvaluate(
  packDir: string,
  intentFile: string,
  artifactsDir: string,
  outFile: string,
  runId: string | undefined,
  io: CliIo,
): ExitCode {
  const validation = validatePack(packDir);
  if (!validation.ok) {
    for (const issue of validation.issues) {
      io.err(`[${issue.stage}] ${issue.file}: ${issue.message}`);
    }
    return exitCodeForFailedStage(validation.failedStage ?? "environment");
  }

  if (!existsSync(intentFile)) {
    io.err(`intent file does not exist: ${intentFile}`);
    return EXIT_CODES.environmentError;
  }
  const intent = JSON.parse(
    readFileSync(intentFile, "utf8"),
  ) as DesignIntentContract;

  const manifestPath = join(artifactsDir, "capture-manifest.json");
  if (!existsSync(manifestPath)) {
    io.err(`capture-manifest.json not found in artifacts dir: ${artifactsDir}`);
    return EXIT_CODES.environmentError;
  }
  const manifestRaw = readFileSync(manifestPath, "utf8");
  const captureManifest = JSON.parse(manifestRaw) as {
    scenario: string;
    artifacts: { path: string; sha256: string }[];
  };
  if (captureManifest.scenario !== intent.task.scenario) {
    io.err(
      `artifacts belong to scenario ${captureManifest.scenario}, but the intent targets ${intent.task.scenario}`,
    );
    return EXIT_CODES.brokenReference;
  }

  const scenario = loadScenarios(packDir).find(
    (s) => s.id === intent.task.scenario,
  );
  if (!scenario) {
    io.err(`scenario not declared in pack: ${intent.task.scenario}`);
    return EXIT_CODES.brokenReference;
  }

  const snapshotPath = join(artifactsDir, "ui-snapshot.json");
  const uiSnapshot = existsSync(snapshotPath)
    ? (JSON.parse(readFileSync(snapshotPath, "utf8")) as UISnapshot)
    : undefined;

  const context: EvaluationContext = {
    scenarioId: scenario.id,
    requiredArtifacts: scenario.required_artifacts,
    requiredElementIdentifiers: scenario.required_element_identifiers ?? [],
    captureManifest,
    ...(uiSnapshot !== undefined ? { uiSnapshot } : {}),
    screenshotArtifact: "screenshot.png",
  };

  const findings = DETERMINISTIC_EVALUATORS.flatMap((evaluator) =>
    evaluator.evaluate(context),
  );
  // Why not: 実行時刻ベースの run id も一般的 | Reason: 同一入力→同一出力の再現性 (§22.2, #15) を
  // 成果物ハッシュ由来の id で機械的に保証する。時刻は run-manifest (#22) が別途持つ
  const effectiveRunId =
    runId ??
    `run-${createHash("sha256").update(manifestRaw).digest("hex").slice(0, 12)}`;
  const evaluation = buildEvaluation(effectiveRunId, findings);

  const documentCheck = validateEvaluationDocument(evaluation);
  if (!documentCheck.ok) {
    io.err(
      `internal error: evaluation violates schema: ${documentCheck.errors}`,
    );
    return EXIT_CODES.environmentError;
  }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(evaluation, null, 2)}\n`);

  const gate = gateDecision(findings);
  const s = evaluation.summary;
  io.out(
    `evaluation written: ${outFile} (deterministic pass=${s.deterministic.pass} fail=${s.deterministic.fail} unknown=${s.deterministic.unknown ?? 0}, human_review=${s.human_review})`,
  );
  if (!gate.pass) {
    for (const finding of gate.blockingFindings) {
      io.err(`[fail] ${finding.evaluator}: ${finding.judgment}`);
    }
    io.err(
      `gate: FAIL (${gate.blockingFindings.length} deterministic failure(s))`,
    );
    return EXIT_CODES.schemaViolation;
  }
  io.out("gate: PASS");
  return EXIT_CODES.valid;
}
