import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  loadPackContent,
  loadScenarios,
  validateEvaluationDocument,
  validatePack,
} from "@tenetr/core";
import type { EvaluationContext, ProviderTransport } from "@tenetr/evaluators";
import {
  accessibilityLabelEvaluator,
  artifactPresenceEvaluator,
  buildEvaluation,
  buildModelRequests,
  createClaudeCliTransport,
  createModuleTransport,
  gateDecision,
  primaryControlCountEvaluator,
  primaryStyleDistinctEvaluator,
  requiredElementsEvaluator,
  runModelEvaluation,
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

export interface EvaluateOptions {
  runId?: string;
  modelTransport?: string;
  confidenceThreshold: number;
}

export async function runEvaluate(
  packDir: string,
  intentFile: string,
  artifactsDir: string,
  outFile: string,
  options: EvaluateOptions,
  io: CliIo,
): Promise<ExitCode> {
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

  if (options.modelTransport) {
    let transport: ProviderTransport;
    if (options.modelTransport === "claude-cli") {
      transport = createClaudeCliTransport();
    } else if (options.modelTransport.startsWith("module:")) {
      transport = await createModuleTransport(
        options.modelTransport.slice("module:".length),
      );
    } else {
      io.err(`unknown model transport: ${options.modelTransport}`);
      return EXIT_CODES.environmentError;
    }

    const content = loadPackContent(packDir);
    const afterEntry = captureManifest.artifacts.find(
      (a) => a.path === "screenshot.png",
    );
    if (!afterEntry) {
      io.err(
        "model evaluation requires screenshot.png in the capture manifest",
      );
      return EXIT_CODES.environmentError;
    }
    const requests = buildModelRequests(
      {
        principles: content.principles,
        exemplars: content.exemplars,
      },
      {
        task: {
          description: intent.task.description,
          scenario: intent.task.scenario,
        },
        constraints: intent.constraints ?? [],
        applicablePrincipleIds: intent.applicable_principles.map((p) => p.id),
      },
      {
        afterImage: {
          path: join(artifactsDir, "screenshot.png"),
          sha256: afterEntry.sha256,
        },
        exemplarImage: (exemplarId) => {
          const exemplar = content.exemplars.find((e) => e.id === exemplarId);
          if (!exemplar || !existsSync(exemplar.artifactPath)) return undefined;
          const bytes = readFileSync(exemplar.artifactPath);
          return {
            path: exemplar.artifactPath,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          };
        },
      },
    );
    const audits: unknown[] = [];
    const modelFindings = await runModelEvaluation(requests, transport, {
      confidenceThreshold: options.confidenceThreshold,
      egressPolicy: {
        policy_version: "1.0",
        allowed_purposes: ["after", "exemplar-accepted", "exemplar-rejected"],
        mask_regions: scenario.mask_regions ?? [],
      },
      onAudit: (audit) => audits.push(audit),
    });
    findings.push(...modelFindings);
    writeFileSync(
      join(artifactsDir, "egress-audit.json"),
      `${JSON.stringify({ schema_version: "1.0", audits }, null, 2)}\n`,
    );
    io.out(
      `egress audit written: ${join(artifactsDir, "egress-audit.json")} (${audits.length} request(s))`,
    );
  }
  // Why not: 実行時刻ベースの run id も一般的 | Reason: 同一入力→同一出力の再現性 (§22.2, #15) を
  // 成果物ハッシュ由来の id で機械的に保証する。時刻は run-manifest (#22) が別途持つ
  const effectiveRunId =
    options.runId ??
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
