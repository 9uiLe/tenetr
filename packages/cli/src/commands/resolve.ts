import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { resolveIntent } from "@tenetr/core";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES, exitCodeForFailedStage } from "../exit-codes.js";
import type { CliIo } from "../io.js";

export function runResolve(
  packDir: string,
  taskFile: string,
  outFile: string,
  io: CliIo,
): ExitCode {
  const outcome = resolveIntent(packDir, taskFile);
  if (!outcome.ok) {
    const failure = outcome.failure;
    switch (failure.kind) {
      case "pack-invalid": {
        for (const issue of failure.validation.issues) {
          io.err(`[${issue.stage}] ${issue.file}: ${issue.message}`);
        }
        return exitCodeForFailedStage(
          failure.validation.failedStage ?? "environment",
        );
      }
      case "task-environment":
        io.err(failure.message);
        return EXIT_CODES.environmentError;
      case "task-invalid":
        io.err(failure.message);
        return EXIT_CODES.schemaViolation;
      case "intent-schema":
        io.err(failure.message);
        return EXIT_CODES.schemaViolation;
    }
  }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(outcome.intent, null, 2)}\n`);
  const intent = outcome.intent;
  io.out(`design intent written: ${outFile}`);
  io.out(
    `principles: ${intent.applicable_principles.length}, exemplars: ${intent.referenced_exemplars.length}, ready_to_implement: ${intent.ready_to_implement}`,
  );
  if (!intent.ready_to_implement) {
    for (const blocker of intent.ready_blockers) io.err(`blocker: ${blocker}`);
  }
  return EXIT_CODES.valid;
}
