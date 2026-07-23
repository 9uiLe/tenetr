import { loadScenarios, validatePack } from "@tenetr/core";
import { loadProfiles, runCapture } from "@tenetr/ios-adapter";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES, exitCodeForFailedStage } from "../exit-codes.js";
import type { CliIo } from "../io.js";

export function runCaptureCommand(
  packDir: string,
  scenarioId: string,
  profilesFile: string,
  outDir: string,
  io: CliIo,
): ExitCode {
  const validation = validatePack(packDir);
  if (!validation.ok) {
    for (const issue of validation.issues) {
      io.err(`[${issue.stage}] ${issue.file}: ${issue.message}`);
    }
    return exitCodeForFailedStage(validation.failedStage ?? "environment");
  }

  const scenario = loadScenarios(packDir).find((s) => s.id === scenarioId);
  if (!scenario) {
    io.err(
      `unknown scenario id: ${scenarioId} (declare it in the pack's scenarios file)`,
    );
    return EXIT_CODES.brokenReference;
  }

  const profiles = loadProfiles(profilesFile);
  if (!profiles.ok) {
    io.err(profiles.message);
    return EXIT_CODES.environmentError;
  }
  const profile = profiles.profiles[scenario.capture_profile];
  if (!profile) {
    io.err(
      `capture profile not found in trusted profiles: ${scenario.capture_profile}`,
    );
    return EXIT_CODES.environmentError;
  }

  const outcome = runCapture(
    {
      id: scenario.id,
      capture_profile: scenario.capture_profile,
      required_artifacts: scenario.required_artifacts,
      ...(scenario.environment !== undefined
        ? { environment: scenario.environment }
        : {}),
    },
    scenario.capture_profile,
    profile,
    outDir,
  );
  if (!outcome.ok) {
    io.err(outcome.message);
    return outcome.kind === "snapshot-schema"
      ? EXIT_CODES.schemaViolation
      : EXIT_CODES.environmentError;
  }
  io.out(`capture complete: ${outcome.manifestPath}`);
  io.out(`artifacts: ${outcome.artifacts.map((a) => a.path).join(", ")}`);
  return EXIT_CODES.valid;
}
