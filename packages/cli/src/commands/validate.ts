import { validatePack } from "@tenetr/core";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES, exitCodeForFailedStage } from "../exit-codes.js";
import type { CliIo } from "../io.js";

export function runValidate(packDir: string, io: CliIo): ExitCode {
  const result = validatePack(packDir);
  if (result.ok) {
    io.out(`pack is valid: ${packDir}`);
    return EXIT_CODES.valid;
  }
  for (const issue of result.issues) {
    const location = issue.path ? `${issue.file} ${issue.path}` : issue.file;
    io.err(`[${issue.stage}] ${location}: ${issue.message}`);
  }
  const stage = result.failedStage ?? "environment";
  io.err(
    `pack validation failed at stage: ${stage} (${result.issues.length} issue(s))`,
  );
  return exitCodeForFailedStage(stage);
}
