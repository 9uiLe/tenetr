import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

export interface CaptureProfile {
  command: string[];
  cwd?: string;
  timeout_seconds?: number;
}

export type ProfilesResult =
  | { ok: true; profiles: Record<string, CaptureProfile> }
  | { ok: false; message: string };

// Why not: プロファイルを Pack 内に置くことも出来る | Reason: Pack は PR で書き換え可能であり、
// 実行コマンドを含めると任意コード実行経路になる (ADR-0005 Q1)。信頼済み設定として Pack 外から渡す
export function loadProfiles(file: string): ProfilesResult {
  if (!existsSync(file)) {
    return { ok: false, message: `profiles file does not exist: ${file}` };
  }
  let doc: unknown;
  try {
    doc = parse(readFileSync(file, "utf8"));
  } catch (error) {
    return {
      ok: false,
      message: `profiles YAML parse error: ${(error as Error).message}`,
    };
  }
  const profiles = (doc as { profiles?: Record<string, CaptureProfile> })
    ?.profiles;
  if (typeof profiles !== "object" || profiles === null) {
    return {
      ok: false,
      message: "profiles file must declare a top-level profiles mapping",
    };
  }
  for (const [id, profile] of Object.entries(profiles)) {
    if (
      !Array.isArray(profile.command) ||
      profile.command.length === 0 ||
      profile.command.some((part) => typeof part !== "string")
    ) {
      return {
        ok: false,
        message: `profile ${id} must declare command as a non-empty string array`,
      };
    }
  }
  return { ok: true, profiles };
}
