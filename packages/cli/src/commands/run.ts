import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  gitContext,
  HARNESS_VERSION,
  loadPackVersion,
  packSha256,
  sha256File,
  validateRunManifest,
} from "@tenetr/core";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES } from "../exit-codes.js";
import type { CliIo } from "../io.js";
import { runCaptureCommand } from "./capture.js";
import { runEvaluate } from "./evaluate.js";
import { runReport } from "./report.js";
import { runResolve } from "./resolve.js";

export interface RunOptions {
  scenario: string;
  profilesFile: string;
  modelTransport?: string;
  confidenceThreshold: number;
  beforeImage?: string;
}

export async function runPipeline(
  packDir: string,
  taskFile: string,
  outDir: string,
  options: RunOptions,
  io: CliIo,
): Promise<ExitCode> {
  const startedAt = new Date().toISOString();
  const intentFile = join(outDir, "intent.json");
  const artifactsDir = join(outDir, "artifacts");
  const evaluationFile = join(outDir, "evaluation.json");
  const reportFile = join(outDir, "report.html");
  const jsonReportFile = join(outDir, "report.json");
  const manifestFile = join(outDir, "run-manifest.json");

  const resolveCode = runResolve(packDir, taskFile, intentFile, io);
  if (resolveCode !== EXIT_CODES.valid) return resolveCode;

  const captureCode = runCaptureCommand(
    packDir,
    options.scenario,
    options.profilesFile,
    artifactsDir,
    io,
  );
  if (captureCode !== EXIT_CODES.valid) return captureCode;

  const evaluateCode = await runEvaluate(
    packDir,
    intentFile,
    artifactsDir,
    evaluationFile,
    {
      ...(options.modelTransport !== undefined
        ? { modelTransport: options.modelTransport }
        : {}),
      confidenceThreshold: options.confidenceThreshold,
    },
    io,
  );
  // Why not: gate FAIL で即 return も可能 | Reason: §5.3 のとおり Fail でも人間が見るレポートと
  // Manifest は必ず残す。exit code は最後に gate の結果を返す
  if (
    evaluateCode !== EXIT_CODES.valid &&
    evaluateCode !== EXIT_CODES.schemaViolation
  ) {
    return evaluateCode;
  }

  const packVersion = loadPackVersion(packDir);
  for (const [format, out] of [
    ["html", reportFile],
    ["json", jsonReportFile],
  ] as const) {
    const reportCode = runReport(
      evaluationFile,
      intentFile,
      artifactsDir,
      out,
      {
        format,
        packVersion: packVersion,
        ...(options.beforeImage !== undefined
          ? { beforeImage: options.beforeImage }
          : {}),
      },
      io,
    );
    if (reportCode !== EXIT_CODES.valid) return reportCode;
  }

  const captureManifest = JSON.parse(
    readFileSync(join(artifactsDir, "capture-manifest.json"), "utf8"),
  ) as {
    scenario: string;
    environment?: Record<string, string>;
    artifacts: { path: string; sha256: string }[];
  };
  const evaluation = JSON.parse(readFileSync(evaluationFile, "utf8")) as {
    run_id: string;
  };
  const git = gitContext(packDir);
  const auditPath = join(artifactsDir, "egress-audit.json");
  const maskingApplied = existsSync(auditPath)
    ? (
        JSON.parse(readFileSync(auditPath, "utf8")) as {
          audits: { images: { masked: boolean }[] }[];
        }
      ).audits.some((a) => a.images.some((i) => i.masked))
    : false;
  const env = captureManifest.environment ?? {};

  const manifest = {
    schema_version: "1.0",
    run_id: evaluation.run_id,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    versions: {
      philosophy_pack: packVersion,
      philosophy_pack_sha256: packSha256(packDir),
      harness: HARNESS_VERSION,
    },
    source: git,
    task: { file: taskFile, sha256: sha256File(taskFile) },
    intent: { file: "intent.json", sha256: sha256File(intentFile) },
    capture: {
      scenario: captureManifest.scenario,
      ...(env.device !== undefined ? { device: env.device } : {}),
      ...(env.os !== undefined ? { os: env.os } : {}),
      ...(env.locale !== undefined ? { locale: env.locale } : {}),
      ...(env.appearance === "light" || env.appearance === "dark"
        ? { appearance: env.appearance }
        : {}),
      ...(env.dynamic_type !== undefined
        ? { dynamic_type: env.dynamic_type }
        : {}),
    },
    model_evaluation: options.modelTransport
      ? {
          enabled: true,
          provider: options.modelTransport,
          model: options.modelTransport,
          masking_applied: maskingApplied,
        }
      : { enabled: false },
    artifacts: [
      ...captureManifest.artifacts.map((a) => ({
        path: join("artifacts", a.path),
        sha256: a.sha256,
      })),
      // Why not: capture 成果物のみでも §15 は成立し得る | Reason: §22.2 の「モデル情報と
      // Prompt Hash が保存される」は egress 監査 (payload_sha256) が担うため、監査自体を
      // Manifest の追跡対象に含めて replay の完全性検証下に置く
      ...(existsSync(auditPath)
        ? [
            {
              path: join("artifacts", "egress-audit.json"),
              sha256: sha256File(auditPath),
            },
          ]
        : []),
    ],
    evaluation: { file: "evaluation.json", sha256: sha256File(evaluationFile) },
  };
  const manifestCheck = validateRunManifest(manifest);
  if (!manifestCheck.ok) {
    io.err(
      `internal error: run manifest violates schema: ${manifestCheck.errors}`,
    );
    return EXIT_CODES.environmentError;
  }
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  io.out(`run manifest written: ${manifestFile}`);
  return evaluateCode;
}
