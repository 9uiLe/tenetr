import { Command, CommanderError } from "commander";
import { runInit } from "./commands/init.js";
import { runResolve } from "./commands/resolve.js";
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
    .command("validate")
    .description("validate a philosophy pack directory (§10.2)")
    .requiredOption("--pack <dir>", "path to the design-philosophy directory")
    .action((options: { pack: string }) => {
      exitCode = runValidate(options.pack, io);
    });

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
