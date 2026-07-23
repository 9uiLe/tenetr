import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HARNESS_VERSION } from "@tenetr/core";
import type { ReportData } from "@tenetr/reporters";
import { buildJsonReport, renderHtml } from "@tenetr/reporters";
import type { DesignIntentContract, EvaluationResult } from "@tenetr/spec";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES } from "../exit-codes.js";
import type { CliIo } from "../io.js";

export interface ReportOptions {
  format: string;
  packVersion?: string;
  beforeImage?: string;
}

export function runReport(
  evaluationFile: string,
  intentFile: string,
  artifactsDir: string,
  outFile: string,
  options: ReportOptions,
  io: CliIo,
): ExitCode {
  for (const [label, file] of [
    ["evaluation", evaluationFile],
    ["intent", intentFile],
    ["capture-manifest", join(artifactsDir, "capture-manifest.json")],
  ] as const) {
    if (!existsSync(file)) {
      io.err(`${label} file does not exist: ${file}`);
      return EXIT_CODES.environmentError;
    }
  }
  if (options.format !== "json" && options.format !== "html") {
    io.err(`unknown report format: ${options.format} (json | html)`);
    return EXIT_CODES.environmentError;
  }

  const evaluation = JSON.parse(
    readFileSync(evaluationFile, "utf8"),
  ) as EvaluationResult;
  const intent = JSON.parse(
    readFileSync(intentFile, "utf8"),
  ) as DesignIntentContract;
  const capture = JSON.parse(
    readFileSync(join(artifactsDir, "capture-manifest.json"), "utf8"),
  ) as ReportData["capture"];

  const loadImage = (path: string | undefined) => {
    if (!path || !existsSync(path)) return undefined;
    return {
      mimeType: "image/png",
      base64: readFileSync(path).toString("base64"),
    };
  };

  const data: ReportData = {
    run_id: evaluation.run_id,
    intent,
    evaluation,
    capture,
    versions: {
      harness: HARNESS_VERSION,
      ...(options.packVersion !== undefined
        ? { philosophy_pack: options.packVersion }
        : {}),
    },
    images: {},
  };
  const after = loadImage(join(artifactsDir, "screenshot.png"));
  if (after) data.images.after = after;
  const before = loadImage(options.beforeImage);
  if (before) data.images.before = before;

  mkdirSync(dirname(outFile), { recursive: true });
  const output =
    options.format === "html"
      ? renderHtml(data)
      : `${JSON.stringify(buildJsonReport(data), null, 2)}\n`;
  writeFileSync(outFile, output);
  io.out(`report written: ${outFile} (${options.format})`);
  return EXIT_CODES.valid;
}
