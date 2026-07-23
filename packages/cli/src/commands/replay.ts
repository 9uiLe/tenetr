import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256File } from "@tenetr/core";
import type { RunManifest } from "@tenetr/spec";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES } from "../exit-codes.js";
import type { CliIo } from "../io.js";
import { runEvaluate } from "./evaluate.js";

// §15.1: replay は同一入力・評価条件から同一の評価を再構成できることの検証。
// 保存済み成果物のハッシュを検証し、評価のみ再実行して元の evaluation と比較する。
export async function runReplay(
  manifestFile: string,
  packDir: string,
  io: CliIo,
): Promise<ExitCode> {
  if (!existsSync(manifestFile)) {
    io.err(`manifest does not exist: ${manifestFile}`);
    return EXIT_CODES.environmentError;
  }
  const runDir = dirname(manifestFile);
  const manifest = JSON.parse(
    readFileSync(manifestFile, "utf8"),
  ) as RunManifest;

  for (const artifact of manifest.artifacts) {
    const path = join(runDir, artifact.path);
    if (!existsSync(path)) {
      io.err(`artifact missing: ${artifact.path}`);
      return EXIT_CODES.brokenReference;
    }
    const actual = sha256File(path);
    if (actual !== artifact.sha256) {
      io.err(
        `artifact hash mismatch: ${artifact.path} (recorded ${artifact.sha256.slice(0, 12)}…, actual ${actual.slice(0, 12)}…)`,
      );
      return EXIT_CODES.brokenReference;
    }
  }

  const intentFile = join(runDir, manifest.intent.file);
  if (sha256File(intentFile) !== manifest.intent.sha256) {
    io.err("intent.json hash mismatch");
    return EXIT_CODES.brokenReference;
  }

  const replayOut = join(runDir, "replay-evaluation.json");
  const code = await runEvaluate(
    packDir,
    intentFile,
    join(runDir, "artifacts"),
    replayOut,
    { confidenceThreshold: 0.7 },
    io,
  );
  if (code !== EXIT_CODES.valid && code !== EXIT_CODES.schemaViolation)
    return code;

  const replaySha = sha256File(replayOut);
  if (replaySha === manifest.evaluation.sha256) {
    io.out("replay OK: evaluation is byte-identical to the recorded run");
    return EXIT_CODES.valid;
  }
  // Why not: 不一致を即エラーにせず警告に留める案もある | Reason: §22.3 の「過去Runをreplayできる」は
  // 再構成の同一性検証が目的であり、不一致は決定性の破れ (harness 変更含む) として明示的に失敗させる
  io.err(
    `replay MISMATCH: recorded ${manifest.evaluation.sha256.slice(0, 12)}…, replayed ${replaySha.slice(0, 12)}… (harness 変更または非決定性)`,
  );
  return EXIT_CODES.schemaViolation;
}
