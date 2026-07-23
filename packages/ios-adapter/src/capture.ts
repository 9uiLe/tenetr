import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import { loadSchema } from "@tenetr/spec";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { CaptureProfile } from "./profiles.js";

export interface ScenarioSpec {
  id: string;
  capture_profile: string;
  required_artifacts: string[];
  environment?: Record<string, string>;
}

export type CaptureOutcome =
  | {
      ok: true;
      manifestPath: string;
      artifacts: { path: string; sha256: string }[];
    }
  | { ok: false; kind: "environment" | "snapshot-schema"; message: string };

interface CaptureResultFile {
  schema_version?: string;
  scenario?: string;
  environment?: Record<string, string>;
  artifacts?: string[];
  tool?: string;
  tool_version?: string;
}

// Why not: 子プロセスへ親環境をそのまま継承させることも出来る | Reason: capture コマンドは製品側の
// 任意実装であり、セッションの資格情報・API キーを見せない (ADR-0005 Q1 の env allowlist)
const ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "DEVELOPER_DIR",
];

export function runCapture(
  scenario: ScenarioSpec,
  profileId: string,
  profile: CaptureProfile,
  outDir: string,
): CaptureOutcome {
  mkdirSync(outDir, { recursive: true });

  const env: Record<string, string> = {};
  for (const key of ENV_ALLOWLIST) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  env.OUT_DIR = outDir;
  env.SCENARIO_ID = scenario.id;

  const [executable, ...args] = profile.command;
  if (!executable) {
    return {
      ok: false,
      kind: "environment",
      message: "profile command is empty",
    };
  }
  const spawned = spawnSync(executable, args, {
    shell: false,
    cwd: profile.cwd,
    env,
    timeout: (profile.timeout_seconds ?? 300) * 1000,
    encoding: "utf8",
  });
  if (spawned.error) {
    return {
      ok: false,
      kind: "environment",
      message: `capture command failed to start: ${spawned.error.message}`,
    };
  }
  if (spawned.status !== 0) {
    const stderrTail = (spawned.stderr ?? "").split("\n").slice(-5).join("\n");
    return {
      ok: false,
      kind: "environment",
      message: `capture command exited with ${spawned.status}: ${stderrTail}`,
    };
  }

  const resultPath = join(outDir, "capture-result.json");
  if (!existsSync(resultPath)) {
    return {
      ok: false,
      kind: "environment",
      message: "capture command did not produce capture-result.json",
    };
  }
  let result: CaptureResultFile;
  try {
    result = JSON.parse(readFileSync(resultPath, "utf8")) as CaptureResultFile;
  } catch (error) {
    return {
      ok: false,
      kind: "environment",
      message: `capture-result.json parse error: ${(error as Error).message}`,
    };
  }
  if (result.scenario !== scenario.id) {
    return {
      ok: false,
      kind: "environment",
      message: `capture-result.json reports scenario ${String(result.scenario)}, expected ${scenario.id}`,
    };
  }

  const declared = new Set([
    ...(result.artifacts ?? []),
    ...scenario.required_artifacts,
  ]);
  for (const rel of declared) {
    if (isAbsolute(rel) || normalize(rel).startsWith("..")) {
      return {
        ok: false,
        kind: "environment",
        message: `artifact path escapes output directory: ${rel}`,
      };
    }
  }
  for (const rel of scenario.required_artifacts) {
    if (!existsSync(join(outDir, rel))) {
      return {
        ok: false,
        kind: "environment",
        message: `required artifact missing: ${rel}`,
      };
    }
  }

  const snapshotPath = join(outDir, "ui-snapshot.json");
  if (existsSync(snapshotPath)) {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(loadSchema("ui-snapshot"));
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    } catch (error) {
      return {
        ok: false,
        kind: "snapshot-schema",
        message: `ui-snapshot.json parse error: ${(error as Error).message}`,
      };
    }
    if (!validate(snapshot)) {
      return {
        ok: false,
        kind: "snapshot-schema",
        message: `ui-snapshot.json violates schema: ${JSON.stringify(validate.errors)}`,
      };
    }
    declared.add("ui-snapshot.json");
  }

  const artifacts: { path: string; sha256: string }[] = [];
  for (const rel of [...declared].sort()) {
    const abs = join(outDir, rel);
    if (!existsSync(abs)) continue;
    const hash = createHash("sha256").update(readFileSync(abs)).digest("hex");
    artifacts.push({ path: rel, sha256: hash });
  }

  const manifest = {
    schema_version: "1.0",
    scenario: scenario.id,
    profile: profileId,
    environment: {
      ...(scenario.environment ?? {}),
      ...(result.environment ?? {}),
    },
    ...(result.tool !== undefined
      ? {
          source: {
            tool: result.tool,
            ...(result.tool_version !== undefined
              ? { tool_version: result.tool_version }
              : {}),
          },
        }
      : {}),
    artifacts,
  };
  const manifestPath = join(outDir, "capture-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { ok: true, manifestPath, artifacts };
}
