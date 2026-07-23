import { Command, CommanderError } from "commander";
import { runCaptureCommand } from "./commands/capture.js";
import { runEvaluate } from "./commands/evaluate.js";
import { runInit } from "./commands/init.js";
import { runReplay } from "./commands/replay.js";
import { runReport } from "./commands/report.js";
import { runResolve } from "./commands/resolve.js";
import { runPipeline } from "./commands/run.js";
import { runValidate } from "./commands/validate.js";
import type { ExitCode } from "./exit-codes.js";
import { EXIT_CODES } from "./exit-codes.js";
import type { CliIo } from "./io.js";
import { processIo } from "./io.js";

export async function run(
  argv: readonly string[],
  io: CliIo = processIo,
): Promise<number> {
  let exitCode: ExitCode = EXIT_CODES.valid;

  const program = new Command("design-harness");
  program
    .description("Design Philosophy Harness CLI (§10)")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.out(text.trimEnd()),
      writeErr: (text) => io.err(text.trimEnd()),
    });

  program
    .command("init")
    .description("generate a design-philosophy/ scaffold (§10.1)")
    .option("--dir <dir>", "parent directory for the scaffold", ".")
    .action((options: { dir: string }) => {
      exitCode = runInit(options.dir, io);
    });

  program
    .command("run")
    .description(
      "resolve → capture → evaluate → report → manifest の一気通貫 (§10.7)",
    )
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .requiredOption("--task <file>", "task definition yaml")
    .requiredOption("--scenario <id>", "scenario id declared in the pack")
    .requiredOption("--profiles <file>", "trusted capture profiles yaml")
    .requiredOption("--out <dir>", "run output directory")
    .option(
      "--model-transport <spec>",
      "claude-cli | module:<path> (default: off)",
    )
    .option(
      "--confidence-threshold <n>",
      "human_review escalation threshold",
      "0.7",
    )
    .option("--before <file>", "before screenshot to embed in the report")
    .action(
      async (options: {
        pack: string;
        task: string;
        scenario: string;
        profiles: string;
        out: string;
        modelTransport?: string;
        confidenceThreshold: string;
        before?: string;
      }) => {
        exitCode = await runPipeline(
          options.pack,
          options.task,
          options.out,
          {
            scenario: options.scenario,
            profilesFile: options.profiles,
            ...(options.modelTransport !== undefined
              ? { modelTransport: options.modelTransport }
              : {}),
            confidenceThreshold: Number(options.confidenceThreshold),
            ...(options.before !== undefined
              ? { beforeImage: options.before }
              : {}),
          },
          io,
        );
      },
    );

  program
    .command("replay")
    .description(
      "保存済み Run を検証し評価のみ再実行して同一性を確認する (§15.3)",
    )
    .requiredOption("--manifest <file>", "run-manifest.json")
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .action(async (options: { manifest: string; pack: string }) => {
      exitCode = await runReplay(options.manifest, options.pack, io);
    });

  program
    .command("validate")
    .description("validate a philosophy pack directory (§10.2)")
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .action((options: { pack: string }) => {
      exitCode = runValidate(options.pack, io);
    });

  program
    .command("capture")
    .description("capture scenario artifacts via a trusted profile (§10.4)")
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .requiredOption("--scenario <id>", "scenario id declared in the pack")
    .requiredOption(
      "--profiles <file>",
      "trusted capture profiles yaml (outside the pack)",
    )
    .requiredOption("--out <dir>", "output directory for artifacts")
    .action(
      (options: {
        pack: string;
        scenario: string;
        profiles: string;
        out: string;
      }) => {
        exitCode = runCaptureCommand(
          options.pack,
          options.scenario,
          options.profiles,
          options.out,
          io,
        );
      },
    );

  program
    .command("evaluate")
    .description(
      "run deterministic evaluators and gate the result (§10.5, §13)",
    )
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .requiredOption("--intent <file>", "design intent contract json")
    .requiredOption("--artifacts <dir>", "capture output directory")
    .requiredOption("--out <file>", "output path for evaluation.json")
    .option(
      "--run-id <id>",
      "run id (default: derived from capture manifest hash)",
    )
    .option(
      "--model-transport <spec>",
      "enable model evaluation: claude-cli | module:<path> (default: off; deterministic only)",
    )
    .option(
      "--confidence-threshold <n>",
      "human_review escalation threshold (§12.4)",
      "0.7",
    )
    .action(
      async (options: {
        pack: string;
        intent: string;
        artifacts: string;
        out: string;
        runId?: string;
        modelTransport?: string;
        confidenceThreshold: string;
      }) => {
        exitCode = await runEvaluate(
          options.pack,
          options.intent,
          options.artifacts,
          options.out,
          {
            ...(options.runId !== undefined ? { runId: options.runId } : {}),
            ...(options.modelTransport !== undefined
              ? { modelTransport: options.modelTransport }
              : {}),
            confidenceThreshold: Number(options.confidenceThreshold),
          },
          io,
        );
      },
    );

  program
    .command("report")
    .description(
      "generate a JSON or HTML report from an evaluation (§10.6, §17)",
    )
    .requiredOption("--evaluation <file>", "evaluation.json")
    .requiredOption("--intent <file>", "design intent contract json")
    .requiredOption("--artifacts <dir>", "capture output directory")
    .requiredOption("--out <file>", "output path")
    .option("--format <format>", "json | html", "html")
    .option("--pack-version <version>", "philosophy pack version to display")
    .option("--before <file>", "before screenshot to embed")
    .action(
      (options: {
        evaluation: string;
        intent: string;
        artifacts: string;
        out: string;
        format: string;
        packVersion?: string;
        before?: string;
      }) => {
        exitCode = runReport(
          options.evaluation,
          options.intent,
          options.artifacts,
          options.out,
          {
            format: options.format,
            ...(options.packVersion !== undefined
              ? { packVersion: options.packVersion }
              : {}),
            ...(options.before !== undefined
              ? { beforeImage: options.before }
              : {}),
          },
          io,
        );
      },
    );

  program
    .command("resolve")
    .description("resolve a task into a design intent contract (§10.3)")
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .requiredOption("--task <file>", "task definition yaml")
    .requiredOption("--out <file>", "output path for intent.json")
    .action((options: { pack: string; task: string; out: string }) => {
      exitCode = runResolve(options.pack, options.task, options.out, io);
    });

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      ) {
        return EXIT_CODES.valid;
      }
      // Why not: commander 既定の exit 1 をそのまま使うことも出来る | Reason: §10.2 で 1 は「スキーマ違反」に
      // 予約されているため、usage 誤りは 4 (実行環境エラー) に集約して契約の衝突を避ける
      return EXIT_CODES.environmentError;
    }
    io.err(`unexpected error: ${(error as Error).message}`);
    return EXIT_CODES.environmentError;
  }
  return exitCode;
}
